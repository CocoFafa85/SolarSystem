import * as THREE from 'three';
import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';

// AxialTiltAxis (LOT 8) — `THREE.Line` matérialisant l'axe de spin d'un astre.
// Parenté à `userData.axialTilt` ⇒ orientation auto avec l'obliquité.
// Longueur = visualRadius × 3 (axes dépassant le mesh des 2 côtés).
//
// Visible uniquement sur `UI.BODY_MESH_HOVER { id: bodyId }`.

// LOT 12 (révision) — facteur ×3 préservé : avec DISTANCE_MULTIPLIER=6 (focus
// à 6×visualRadius), un axe à 3×visualRadius occupe ~0.5 hauteur de vue,
// même apparent angulaire qu'avant le refactor 1:1.
const AXIS_LENGTH_FACTOR = 3;

/**
 * @param {{ bodyNode: import('three').Group, bodyId: string }} deps
 */
export function createAxialTiltAxis({ bodyNode, bodyId }) {
  if (!bodyNode || !bodyId) {
    throw new Error('createAxialTiltAxis: bodyNode + bodyId requis');
  }
  const axialTilt = bodyNode.userData?.axialTilt;
  if (!axialTilt) {
    console.warn('[AxialTiltAxis] axialTilt manquant sur', bodyId);
    return { destroy() {} };
  }
  const visualRadius = bodyNode.userData?.visualRadius ?? 0.02;
  const half = visualRadius * AXIS_LENGTH_FACTOR;

  // Géom 2 vertices pré-alloués — aucun resize runtime.
  const positions = new Float32Array([0, -half, 0, 0, half, 0]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.55,
    depthTest: false,
    depthWrite: false,
  });
  const line = new THREE.Line(geom, mat);
  line.name = `${bodyId}:axialTiltAxis`;
  line.renderOrder = 999;
  line.visible = false;
  axialTilt.add(line);

  const unsubHover = bus.on(UI.BODY_MESH_HOVER, (p) => {
    line.visible = p?.id === bodyId;
  });

  function destroy() {
    unsubHover();
    axialTilt.remove(line);
    geom.dispose();
    mat.dispose();
  }
  return { destroy };
}
