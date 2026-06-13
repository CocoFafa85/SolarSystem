import * as THREE from 'three';
import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';

// bodyMeshHover (LOT 8) — raycaster mousemove sur les MESHES principaux des
// astres. Distinct de `UI.VIEW_HOVER` (BodyMenu) car déclenché uniquement par
// la position 3D du curseur sur le corps lui-même.
//
// CONTRAT C — zéro alloc/mousemove :
//   - `_ray`, `_ndc`, `_intersects` scratch module-scope,
//   - throttle 80 ms identique au reste du codebase,
//   - payload mutualisé `{ id }`.

const THROTTLE_MS = 80;
const _ndc = new THREE.Vector2();

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   camera: import('three').Camera,
 *   bodies: Map<string, import('three').Group>,
 * }} deps
 */
export function createBodyMeshHover({ canvas, camera, bodies }) {
  if (!canvas || !camera || !bodies) {
    throw new Error('createBodyMeshHover: dépendances manquantes');
  }

  const _ray = new THREE.Raycaster();
  const _intersects = [];
  let lastEvent = 0;
  let lastEmittedId = null;
  const _payload = { id: null };

  // Build une liste indexée des meshes principaux (sphère) pour raycast direct.
  // Évite le coût d'un raycast récursif sur tous les Groups (axialTilt, rings…).
  const meshes = [];
  const meshToId = new Map();
  for (const [id, node] of bodies) {
    const mesh = node.userData?.mesh;
    if (mesh) {
      meshes.push(mesh);
      meshToId.set(mesh, id);
    }
  }

  function publish(id) {
    if (id === lastEmittedId) return;
    lastEmittedId = id;
    _payload.id = id;
    bus.emit(UI.BODY_MESH_HOVER, _payload);
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
    _ray.intersectObjects(meshes, false, _intersects);

    if (_intersects.length === 0) {
      publish(null);
      return;
    }
    const id = meshToId.get(_intersects[0].object) ?? null;
    publish(id);
  }

  function onMouseLeave() { publish(null); }

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
