import * as THREE from 'three';

// SunGlow — halo lumineux permanent autour du Soleil.
//
// LOT 7B : la lumière physique (`sunLight.intensity`) et l'apparence visuelle
// sont 2 contrats distincts. Réduire la lumière à 18 (1/r² réaliste) rendait
// le Soleil terne à l'écran ; ce halo restitue la perception "étoile lumineuse"
// sans modifier le calcul d'éclairement physique des planètes.
//
// Architecture :
//   - 1 THREE.Sprite parenté au sunNode (suit la translation héliocentrique).
//   - 1 CanvasTexture dégradé radial chaud (singleton lazy).
//   - SpriteMaterial avec AdditiveBlending + depthWrite=false.
//   - Échelle = visualRadius_sun × 3.5 (couvre généreusement la sphère).
//
// CONTRAT C : Sprite + texture init-only, dispose au teardown.

const TEXTURE_SIZE = 256;
const SCALE_FACTOR = 3.5;

function buildGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  const c = TEXTURE_SIZE / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  // 1. Le Cœur — Intensité MAX (Occupe le centre de la sphère)
  g.addColorStop(0.00, 'rgba(255, 255, 250, 1.00)');
  g.addColorStop(0.15, 'rgba(255, 250, 210, 1.00)');
  g.addColorStop(0.30, 'rgba(255, 235, 130, 1.00)');
  
  // 2. La Transition Dorée — + Intense (Le corps principal, très dense)
  g.addColorStop(0.45, 'rgba(255, 170,  30, 0.98)'); 
  g.addColorStop(0.55, 'rgba(255, 110,   0, 0.95)'); 
  g.addColorStop(0.62, 'rgba(240,  70,   0, 0.90)'); 
  
  // 3. Le Rouge Solaire — Compressé juste au bord (Bordure de la sphère)
  g.addColorStop(0.68, 'rgba(200,  15,   5, 0.80)'); 
  g.addColorStop(0.72, 'rgba(120,   0,   5, 0.50)'); 
  
  // 4. L'Extinction — Dissipation rapide juste après le bord
  g.addColorStop(0.75, 'rgba(50,    0,   0, 0.15)');
  g.addColorStop(0.85, 'rgba(0,     0,   0, 0.00)'); // Extinction finale douce
  g.addColorStop(1.00, 'rgba(0,     0,   0, 0.00)');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Singleton lazy — 1 upload GPU réutilisable si plusieurs étoiles à terme.
let _sharedTexture = null;
function getSharedTexture() {
  if (!_sharedTexture) _sharedTexture = buildGlowTexture();
  return _sharedTexture;
}

/**
 * @param {{ sunNode: import('three').Group | null }} deps
 * @returns {{ sprite: THREE.Sprite, destroy: () => void } | null}
 */
export function createSunGlow({ sunNode }) {
  if (!sunNode) return null;
  const visualRadius = sunNode.userData?.visualRadius ?? 0.25;

  const material = new THREE.SpriteMaterial({
    map: getSharedTexture(),
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 1.0,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = 'SunGlow';
  const halo = visualRadius * SCALE_FACTOR;
  sprite.scale.set(halo, halo, 1);
  sunNode.add(sprite);

  function destroy() {
    sunNode.remove(sprite);
    material.dispose();
    // Texture partagée libérée via disposeSunGlowShared() au teardown global.
  }
  return { sprite, destroy };
}

export function disposeSunGlowShared() {
  if (_sharedTexture) {
    _sharedTexture.dispose();
    _sharedTexture = null;
  }
}
