import * as THREE from 'three';
import * as bus from '../ui/core/eventBus.js';
import { ENGINE } from '../ui/core/channels.js';

// SolarFlareVisual — halo lumineux superposé au Soleil pendant une éruption.
//
// Stratégie :
//   - 1 Sprite billboard parenté au Soleil (suit naturellement sa position).
//   - SpriteMaterial avec CanvasTexture (dégradé radial rouge→orange→transparent)
//     généré UNE FOIS à l'init — aucune dépendance asset externe.
//   - Animation d'opacité scalaire Float64 (zéro alloc en RAF).
//
// Phases :
//   start(intensity) → animation 0 → intensity en FADE_IN_SEC, puis stable.
//   end()            → animation valeur courante → 0 en FADE_OUT_SEC.
//
// Abonnements canaux ENGINE.SOLAR_FLARE_START / END.

const TEXTURE_SIZE = 128;
const FADE_IN_SEC = 0.8;
const FADE_OUT_SEC = 1.5;
const SCALE_FACTOR = 3;   // halo = visualSun × 3

function buildFlareTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  const cx = TEXTURE_SIZE / 2;
  const cy = TEXTURE_SIZE / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0.00, 'rgba(255, 240, 200, 1.0)');
  grad.addColorStop(0.25, 'rgba(255, 170,  80, 0.85)');
  grad.addColorStop(0.55, 'rgba(255,  90,  40, 0.40)');
  grad.addColorStop(1.00, 'rgba(255,  40,  20, 0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * @param {{ sunNode: import('three').Group | null }} deps
 */
export function createSolarFlareVisual({ sunNode }) {
  if (!sunNode) {
    console.warn('[SolarFlareVisual] sunNode manquant — visual désactivé');
    return {
      tick() {},
      destroy() {},
      start() {},
      end() {},
    };
  }

  const visualRadius = sunNode.userData?.visualRadius ?? 0.25;
  const texture = buildFlareTexture();
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = 'SolarFlare';
  const halo = visualRadius * SCALE_FACTOR;
  sprite.scale.set(halo, halo, 1);
  sunNode.add(sprite);

  // État animation — scalaires Float64, zéro alloc.
  // phase: 0 idle, 1 fading-in, 2 holding, 3 fading-out
  const state = {
    phase: 0,
    elapsed: 0,
    fromOpacity: 0,
    targetOpacity: 0,
    duration: FADE_IN_SEC,
  };

  function snapshotFromCurrent() {
    state.fromOpacity = material.opacity;
    state.elapsed = 0;
  }

  function start(intensity) {
    const t = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 1;
    snapshotFromCurrent();
    state.targetOpacity = t;
    state.duration = FADE_IN_SEC;
    state.phase = 1;
  }

  function end() {
    snapshotFromCurrent();
    state.targetOpacity = 0;
    state.duration = FADE_OUT_SEC;
    state.phase = 3;
  }

  function tick(dt) {
    if (state.phase === 0 || state.phase === 2) return;
    state.elapsed += dt;
    const k = Math.min(1, state.elapsed / state.duration);
    material.opacity = state.fromOpacity + (state.targetOpacity - state.fromOpacity) * k;
    if (k >= 1) {
      if (state.phase === 1) {
        // hold à intensité demandée jusqu'au prochain END
        state.phase = 2;
      } else {
        // fade-out terminé → idle, opacité strictement 0
        material.opacity = 0;
        state.phase = 0;
      }
    }
  }

  const unsubStart = bus.on(ENGINE.SOLAR_FLARE_START, (p) => start(p?.intensity ?? 1));
  const unsubEnd = bus.on(ENGINE.SOLAR_FLARE_END, () => end());

  function destroy() {
    unsubStart();
    unsubEnd();
    sunNode.remove(sprite);
    if (material.map) material.map.dispose();
    material.dispose();
    // Pas de geometry sur Sprite (gérée en interne par Three.js).
  }

  return { tick, destroy, start, end };
}
