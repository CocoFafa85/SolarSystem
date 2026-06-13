import * as THREE from 'three';
import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';

// OrbitLineHover (LOT 8D — robuste) — raycast direct sur les `THREE.Line`
// d'orbites, avec :
//   - threshold ADAPTATIF par Line (proportionnel à `semiMajorAxisAu`),
//   - garde explicite par groupe parent (n'écoute PAS Three.js skip natif).
//
// Garde toggles (3 booléens scope handler) :
//   planetsVisible / minorVisible / dwarfsVisible — synchronisés par les 3
//   abonnements `UI.ORBITS_TOGGLE_*`. Initialisés à `false` (cohérence ARIA).
//
// CONTRAT C : 1 raycaster + scratch + payload mutualisé. Throttle 80 ms.

const THROTTLE_MS = 80;
const MIN_LINE_THRESHOLD_AU = 0.02;
const LINE_THRESHOLD_RATIO = 0.05;     // 5% de semi-grand axe

const _ndc = new THREE.Vector2();
const _world = new THREE.Vector3();

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   camera: import('three').Camera,
 *   planetRoot: import('three').Group,
 *   dwarfRoot:  import('three').Group,
 *   minorRoot:  import('three').Group,
 * }} deps
 */
export function createOrbitLineHover({
  canvas, camera, planetRoot, dwarfRoot, minorRoot,
}) {
  if (!canvas || !camera || !planetRoot || !dwarfRoot || !minorRoot) {
    throw new Error('createOrbitLineHover: dépendances manquantes');
  }

  const _ray = new THREE.Raycaster();
  _ray.params.Line = _ray.params.Line || {};
  _ray.params.Line.threshold = MIN_LINE_THRESHOLD_AU; // sera réécrit par-Line

  const _intersects = [];
  let lastEvent = 0;
  let lastEmittedId = null;
  const _payload = { id: null, x: 0, y: 0, idChanged: false };

  // LOT 8D — garde explicite : 3 booléens initiaux false (cohérence ARIA).
  let planetsVisible = false;
  let dwarfsVisible  = false;
  let minorVisible   = false;
  const unsubP = bus.on(UI.ORBITS_TOGGLE_PLANETS, (p) => { planetsVisible = !!p?.visible; });
  const unsubD = bus.on(UI.ORBITS_TOGGLE_DWARFS,  (p) => { dwarfsVisible  = !!p?.visible; });
  const unsubM = bus.on(UI.ORBITS_TOGGLE_MINOR,   (p) => { minorVisible   = !!p?.visible; });

  // LOT 8D bis — collecte DYNAMIQUE à chaque mousemove (throttle 80 ms).
  // Évite tout effet de snapshot dépassé si des orbites sont ajoutées après
  // l'init de ce module (top-3 astéroïdes via loadAsteroids async,
  // futures lunes Phobos/Deimos…). Tableaux scratch module-scope réutilisés.
  const _planetLines = [];
  const _dwarfLines = [];
  const _minorLines = [];
  function collectLinesInto(root, out) {
    out.length = 0;
    root.traverse((c) => { if (c.isLine) out.push(c); });
  }

  function publish(id) {
    const changed = id !== lastEmittedId;
    if (id === null) {
      if (!changed) return;
      _payload.id = null;
      _payload.x = 0; _payload.y = 0;
      _payload.idChanged = true;
      lastEmittedId = null;
      bus.emit(UI.ORBIT_HOVER, _payload);
      return;
    }
    _world.project(camera);
    const rect = canvas.getBoundingClientRect();
    _payload.id = id;
    _payload.x = ((_world.x + 1) * 0.5) * rect.width + rect.left;
    _payload.y = ((-_world.y + 1) * 0.5) * rect.height + rect.top;
    _payload.idChanged = changed;
    lastEmittedId = id;
    bus.emit(UI.ORBIT_HOVER, _payload);
  }

  // Raycast par-groupe avec threshold adaptatif. Retourne le meilleur hit (le
  // plus proche du viewer) parmi les Lines visibles.
  function raycastGroup(lines) {
    let bestHit = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // LOT 8D — threshold proportionnel à `semiMajorAxisAu` (Pluton 39 UA →
      // threshold ≈ 2 UA ; Mercure 0.4 UA → threshold 0.02 UA).
      const a = line.userData?.semiMajorAxisAu ?? 1;
      _ray.params.Line.threshold = Math.max(MIN_LINE_THRESHOLD_AU, LINE_THRESHOLD_RATIO * a);

      _intersects.length = 0;
      _ray.intersectObject(line, false, _intersects);
      if (_intersects.length === 0) continue;
      const hit = _intersects[0];
      if (!bestHit || hit.distance < bestHit.distance) bestHit = hit;
    }
    return bestHit;
  }

  function onMouseMove(ev) {
    const now = performance.now();
    if (now - lastEvent < THROTTLE_MS) return;
    lastEvent = now;

    const rect = canvas.getBoundingClientRect();
    _ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    _ray.setFromCamera(_ndc, camera);

    // LOT 8D — chaque famille n'est testée que si son toggle est ON.
    // LOT 8D bis — collecte dynamique des Lines à chaque mousemove (robuste
    // aux orbites ajoutées après l'init, y compris comètes + top-3 astéroïdes).
    let bestHit = null;
    if (planetsVisible) {
      collectLinesInto(planetRoot, _planetLines);
      const h = raycastGroup(_planetLines);
      if (h && (!bestHit || h.distance < bestHit.distance)) bestHit = h;
    }
    if (dwarfsVisible) {
      collectLinesInto(dwarfRoot, _dwarfLines);
      const h = raycastGroup(_dwarfLines);
      if (h && (!bestHit || h.distance < bestHit.distance)) bestHit = h;
    }
    if (minorVisible) {
      collectLinesInto(minorRoot, _minorLines);
      const h = raycastGroup(_minorLines);
      if (h && (!bestHit || h.distance < bestHit.distance)) bestHit = h;
    }

    if (!bestHit) { publish(null); return; }

    // Résolution id : userData.bodyId prioritaire, fallback parse name.
    let id = bestHit.object?.userData?.bodyId ?? null;
    if (!id) {
      const name = bestHit.object?.name ?? '';
      const colonIdx = name.indexOf(':');
      if (colonIdx > 0) {
        const left = name.slice(0, colonIdx);
        const right = name.slice(colonIdx + 1);
        id = (left === 'orbit') ? right : left;
      }
    }
    if (!id) { publish(null); return; }
    _world.copy(bestHit.point);
    publish(id);
  }

  canvas.addEventListener('mousemove', onMouseMove, { passive: true });

  function destroy() {
    canvas.removeEventListener('mousemove', onMouseMove);
    unsubP(); unsubD(); unsubM();
    _intersects.length = 0;
    lastEmittedId = null;
  }
  return { destroy };
}
