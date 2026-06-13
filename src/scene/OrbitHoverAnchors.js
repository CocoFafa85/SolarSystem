import * as THREE from 'three';
import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';
import { orbitalElementsToHeliocentric } from '../physics/orbital.js';

// OrbitHoverAnchors — anchors sphériques invisibles le long de chaque orbite,
// échantillonnés pour permettre un raycaster précis et pas cher (raycast sur
// `THREE.Line` est imprécis et coûteux en r184).
//
// Architecture :
//   - 16 SphereGeometry(0.001, 6, 4) par orbite,
//   - 1 MeshBasicMaterial partagé { transparent:true, opacity:0 } (1 upload mat),
//   - 1 SphereGeometry partagée (1 upload géom),
//   - Group `orbitHoverAnchors` racine — re-parented hors `orbitGroup` pour
//     rester actif même quand les orbites sont masquées.
//   - Chaque anchor.name = `orbitAnchor:${bodyId}`.
//
// CONTRAT C — zéro alloc par mousemove :
//   - `_ray`, `_ndc`, `_intersects`, `_world` scratch module-scope,
//   - throttle 80 ms identique à SeasonMarkersHover,
//   - payload mutualisé `{ id, x, y, idChanged }`.

// LOT 7B — densification + rayon adaptatif.
//   - SAMPLES 32 : orbites courtes (Mercure) & longues (Pluton) couvertes.
//   - RADIUS = max(0.0005, 0.005 × a) : anchors plus larges sur Neptune/Pluton,
//     plus fins sur Mercure (cohérent avec la distance caméra typique).
const SAMPLES_PER_ORBIT = 32;
const MIN_ANCHOR_RADIUS_AU = 0.0005;
const ANCHOR_RADIUS_RATIO = 0.005;
const THROTTLE_MS = 80;

const _ndc = new THREE.Vector2();
const _world = new THREE.Vector3();

// LOT 7B — pool de géométries par "tier" de rayon (clés discrétisées) pour ne
// pas exploser le nombre d'uploads GPU tout en supportant des tailles distinctes.
// Une seule géométrie unitaire (rayon 1) + Mesh.scale.setScalar(r) serait
// alternative ; on garde un petit pool pour rester compatible avec le raycaster
// (rayon natif géom = surface réelle d'intersection).
const _geomPool = new Map(); // radius rounded → SphereGeometry
let _sharedMat = null;

function getGeomFor(radius) {
  // Quantification à 4 décimales pour limiter les variations à ~5 tiers
  // (Mercure → Pluton couvre 0.4 → 39 UA, ratio donne 0.002 → 0.196).
  const key = Math.round(radius * 10000) / 10000;
  let g = _geomPool.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(key, 6, 4);
    _geomPool.set(key, g);
  }
  return g;
}
function getSharedMat() {
  if (!_sharedMat) {
    _sharedMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
  }
  return _sharedMat;
}

/**
 * Crée le Group des anchors pour TOUS les corps orbitaux fournis.
 * @param {Array<{ id: string, orbital: object }>} orbitalBodies
 */
export function buildOrbitHoverAnchors(orbitalBodies) {
  const root = new THREE.Group();
  root.name = 'OrbitHoverAnchors';
  const mat = getSharedMat();

  const stepDeg = 360 / SAMPLES_PER_ORBIT;

  for (const body of orbitalBodies) {
    if (!body.orbital) continue;
    // LOT 7B — rayon adaptatif par orbite : sphères + larges sur les orbites
    // distantes (Pluton à ~39 UA) pour rester cliquables, sphères + fines sur
    // Mercure (~0.4 UA) pour ne pas masquer les corps internes.
    const a = body.orbital.semiMajorAxisAu;
    const radius = Math.max(MIN_ANCHOR_RADIUS_AU, ANCHOR_RADIUS_RATIO * a);
    const geom = getGeomFor(radius);

    for (let i = 0; i < SAMPLES_PER_ORBIT; i++) {
      const probe = {
        semiMajorAxisAu: a,
        eccentricity: body.orbital.eccentricity,
        inclinationDeg: body.orbital.inclinationDeg,
        longitudeAscendingNodeDeg: body.orbital.longitudeAscendingNodeDeg,
        argumentPerihelionDeg: body.orbital.argumentPerihelionDeg,
        meanAnomalyDeg: (body.orbital.meanAnomalyDeg + i * stepDeg) % 360,
      };
      const p = orbitalElementsToHeliocentric(probe);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = `orbitAnchor:${body.id}`;
      mesh.position.set(p.x, p.y, p.z);
      root.add(mesh);
    }
  }
  return root;
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   camera: import('three').Camera,
 *   anchorsRoot: import('three').Group,
 * }} deps
 */
export function createOrbitHover({ canvas, camera, anchorsRoot }) {
  if (!canvas || !camera || !anchorsRoot) {
    throw new Error('createOrbitHover: dépendances manquantes');
  }

  const _ray = new THREE.Raycaster();
  const _intersects = [];
  let lastEvent = 0;
  let lastEmittedId = null;
  const _payload = { id: null, x: 0, y: 0, idChanged: false };

  function publish(id) {
    const changed = id !== lastEmittedId;
    if (id === null) {
      if (!changed) return;
      _payload.id = null;
      _payload.x = 0;
      _payload.y = 0;
      _payload.idChanged = true;
      lastEmittedId = null;
      bus.emit(UI.ORBIT_HOVER, _payload);
      return;
    }
    // Position monde de l'anchor courant lue dans `_world` (cf. onMouseMove).
    _world.project(camera);
    const rect = canvas.getBoundingClientRect();
    _payload.id = id;
    _payload.x = ((_world.x + 1) * 0.5) * rect.width + rect.left;
    _payload.y = ((-_world.y + 1) * 0.5) * rect.height + rect.top;
    _payload.idChanged = changed;
    lastEmittedId = id;
    bus.emit(UI.ORBIT_HOVER, _payload);
  }

  function onMouseMove(ev) {
    const now = performance.now();
    if (now - lastEvent < THROTTLE_MS) return;
    lastEvent = now;

    const rect = canvas.getBoundingClientRect();
    _ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

    _ray.setFromCamera(_ndc, camera);
    _intersects.length = 0;
    _ray.intersectObjects(anchorsRoot.children, false, _intersects);

    if (_intersects.length === 0) {
      publish(null);
      return;
    }
    // LOT 7C — retour au pattern strict SeasonMarkersHover : émission directe
    // sur `_intersects[0]` (tri Three.js par distance viewer). Le tri perp
    // ajouté en 7B était une cause probable de non-fonctionnement.
    const hit = _intersects[0];
    const name = hit.object?.name ?? '';
    const idx = name.indexOf(':');
    const id = idx > 0 ? name.slice(idx + 1) : null;
    if (id === null) { publish(null); return; }
    hit.object.getWorldPosition(_world);
    publish(id);
  }

  canvas.addEventListener('mousemove', onMouseMove, { passive: true });

  function destroy() {
    canvas.removeEventListener('mousemove', onMouseMove);
    _intersects.length = 0;
    lastEmittedId = null;
  }

  return { destroy };
}

export function disposeOrbitHoverShared() {
  // LOT 7B — pool multi-tiers : dispose toutes les géoms du pool.
  for (const g of _geomPool.values()) g.dispose();
  _geomPool.clear();
  if (_sharedMat) { _sharedMat.dispose(); _sharedMat = null; }
}
