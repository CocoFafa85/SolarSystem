import * as THREE from 'three';
import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';

// Détection de survol des 4 repères équinoxes/solstices via Raycaster.
// LOT 6B : projette la position 3D du marqueur survolé en pixels d'écran et
// l'inclut dans le payload `UI.MARKER_HOVER { id, x, y }` pour permettre à
// `SeasonMarkerTip` (Session D) de placer son tooltip exactement sur le repère.
//
// CONTRAT C — zéro allocation par mousemove :
//   - `_ray`, `_intersects`, `_ndc`, `_world` créés à l'init module-scope.
//   - `intersectObjects(targets, false, _intersects)` mute le tableau (Three.js).
//   - `getWorldPosition(_world)` + `_world.project(camera)` muent le buffer fourni.
//   - DOMRect alloué par `getBoundingClientRect` (~16 alloc/s, gen-0 toléré).
//
// DÉCOUPLAGE id-transition / position :
//   - id change → emit { id, x, y, idChanged: true }
//   - id stable mais survol toujours actif → emit { id, x, y, idChanged: false }
//     (permet à la Session D de suivre Terre qui tourne / caméra qui bouge).

const THROTTLE_MS = 80;

// Scratch buffers module-scope — zéro alloc en RAF/mousemove.
const _ndc = new THREE.Vector2();
const _world = new THREE.Vector3();

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   camera: import('three').Camera,
 *   markersGroup: import('three').Group,
 * }} deps
 */
export function createSeasonMarkersHover({ canvas, camera, markersGroup }) {
  if (!canvas || !camera || !markersGroup) {
    throw new Error('createSeasonMarkersHover: dépendances manquantes');
  }

  const _ray = new THREE.Raycaster();
  const _intersects = [];
  let lastEvent = 0;
  let lastEmittedId = null;
  // Payload mutualisé — mute en place avant `bus.emit` (zéro alloc).
  const _payload = { id: null, x: 0, y: 0, idChanged: false };

  function publish(id, worldPos, rect) {
    const changed = id !== lastEmittedId;
    if (id === null) {
      if (!changed) return;
      _payload.id = null;
      _payload.x = 0;
      _payload.y = 0;
      _payload.idChanged = true;
      lastEmittedId = null;
      bus.emit(UI.MARKER_HOVER, _payload);
      return;
    }
    // Projection NDC → pixels INLINE (zéro alloc, pas de littéral retourné).
    // `_world` est déjà chargé avec la position monde du marker côté caller.
    _world.project(camera);
    _payload.id = id;
    _payload.x = ((_world.x + 1) * 0.5) * rect.width + rect.left;
    _payload.y = ((-_world.y + 1) * 0.5) * rect.height + rect.top;
    _payload.idChanged = changed;
    lastEmittedId = id;
    bus.emit(UI.MARKER_HOVER, _payload);
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
    _ray.intersectObjects(markersGroup.children, false, _intersects);

    if (_intersects.length === 0) {
      publish(null, null, rect);
      return;
    }
    const hit = _intersects[0];
    const name = hit.object?.name ?? '';
    const idx = name.indexOf(':');
    const id = idx > 0 ? name.slice(idx + 1) : null;
    if (id === null) {
      publish(null, null, rect);
      return;
    }
    // Récupère la position MONDE du marqueur (les markers sont enfants
    // d'`orbitGroup`, position locale = monde puisqu'aucune transform parent).
    hit.object.getWorldPosition(_world);
    publish(id, _world, rect);
  }

  function onMouseLeave() {
    publish(null, null, canvas.getBoundingClientRect());
  }

  canvas.addEventListener('mousemove', onMouseMove, { passive: true });
  canvas.addEventListener('mouseleave', onMouseLeave, { passive: true });

  function destroy() {
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    _intersects.length = 0;
    lastEmittedId = null;
  }

  return { destroy };
}
