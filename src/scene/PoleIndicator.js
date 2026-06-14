import * as THREE from 'three';
import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';

// PoleIndicator — étiquettes "N" / "S" sur les pôles d'un astre, visibles
// uniquement au survol. LOT 7C : Terre uniquement (étendable à n'importe
// quel body en passant un autre `bodyId` à `createPoleIndicator`).
//
// Parentés à `userData.axialTilt` ⇒ orientation auto avec l'obliquité (23.44°
// pour Terre). Position locale = ±visualRadius le long de l'axe Y du tilt
// (= axe de spin de l'astre).
//
// CONTRAT C :
//   - 2 Sprite + 2 SpriteMaterial par instance,
//   - 2 CanvasTexture SINGLETONS partagées (1 upload GPU par lettre),
//   - 1 listener bus `UI.VIEW_HOVER`, retiré au destroy.

const TEXTURE_SIZE = 128;
// LOT 12 (révision) — ratios pré-LOT 12 préservés (les facteurs sont
// relatifs à visualRadius, donc l'apparent angulaire au focus reste constant
// quel que soit le multiplicateur d'échelle).
const SCALE_FACTOR = 0.5;        // sprite ≈ 1.4 × visualRadius
const POLE_OFFSET_FACTOR = 1.25; // au-dessus/dessous du mesh

function buildLetterTexture(letter, fillColor) {
  const c = document.createElement('canvas');
  c.width = TEXTURE_SIZE; c.height = TEXTURE_SIZE;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  ctx.fillStyle = fillColor;
  ctx.font = '700 96px system-ui, -apple-system, Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Halo doux pour contraster sur fond noir comme sur planète éclairée.
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 12;
  ctx.fillText(letter, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

let _sharedNorthTex = null;
let _sharedSouthTex = null;
function getNorthTex() {
  if (!_sharedNorthTex) _sharedNorthTex = buildLetterTexture('N', '#abd6ff');
  return _sharedNorthTex;
}
function getSouthTex() {
  if (!_sharedSouthTex) _sharedSouthTex = buildLetterTexture('S', '#abd6ff');
  return _sharedSouthTex;
}

/**
 * @param {{ bodyNode: import('three').Group, bodyId: string }} deps
 */
export function createPoleIndicator({ bodyNode, bodyId }) {
  if (!bodyNode || !bodyId) {
    throw new Error('createPoleIndicator: bodyNode + bodyId requis');
  }
  const axialTilt = bodyNode.userData?.axialTilt;
  if (!axialTilt) {
    console.warn('[PoleIndicator] axialTilt manquant sur', bodyId);
    return { destroy() {} };
  }
  const visualRadius = bodyNode.userData?.visualRadius ?? 0.02;

  const matN = new THREE.SpriteMaterial({
    map: getNorthTex(), transparent: true, depthTest: false, depthWrite: false,
  });
  const matS = new THREE.SpriteMaterial({
    map: getSouthTex(), transparent: true, depthTest: false, depthWrite: false,
  });
  const spriteN = new THREE.Sprite(matN);
  const spriteS = new THREE.Sprite(matS);
  spriteN.name = `${bodyId}:poleN`;
  spriteS.name = `${bodyId}:poleS`;
  const halo = visualRadius * SCALE_FACTOR;
  spriteN.scale.set(halo, halo, 1);
  spriteS.scale.set(halo, halo, 1);
  // Axe de spin = Y local de `axialTilt` (l'obliquité l'oriente déjà).
  const offset = visualRadius * POLE_OFFSET_FACTOR;
  spriteN.position.set(0,  offset, 0);
  spriteS.position.set(0, -offset, 0);
  // Rendus en dernier — toujours visibles, même devant le mesh planétaire.
  spriteN.renderOrder = 1000;
  spriteS.renderOrder = 1000;
  spriteN.visible = false;
  spriteS.visible = false;
  axialTilt.add(spriteN);
  axialTilt.add(spriteS);

  function setVisible(v) {
    spriteN.visible = v;
    spriteS.visible = v;
  }

  // LOT 8 — bascule sur survol du MESH 3D (et non du BodyMenu) via le canal
  // dédié `UI.BODY_MESH_HOVER` émis par `bodyMeshHover.js`.
  const unsubHover = bus.on(UI.BODY_MESH_HOVER, (p) => {
    setVisible(p?.id === bodyId);
  });

  function destroy() {
    unsubHover();
    axialTilt.remove(spriteN);
    axialTilt.remove(spriteS);
    matN.dispose();
    matS.dispose();
  }

  return { destroy, setVisible };
}

/** À appeler au teardown global. */
export function disposePoleIndicatorShared() {
  if (_sharedNorthTex) { _sharedNorthTex.dispose(); _sharedNorthTex = null; }
  if (_sharedSouthTex) { _sharedSouthTex.dispose(); _sharedSouthTex = null; }
}
