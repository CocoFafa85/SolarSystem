import * as THREE from 'three';
import { RENDERER, PIXEL_RATIO_CAP } from '../config/render.config.js';

/**
 * Factory du WebGLRenderer conforme aux contraintes PROJECT.md :
 *  - logarithmicDepthBuffer obligatoire (Z-fighting astronomique).
 *  - Color space sRGB en sortie (API r184).
 *  - Tone mapping ACES Filmic pour gérer la dynamique solaire.
 *
 * Profile C — ajout : handler `webglcontextlost` / `restored` (PLAN.md LOT 2).
 * Aucune allocation au runtime ; tous les listeners sont nettoyés via `userData.detach()`.
 */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, ...RENDERER });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_CAP));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const onLost = (e) => {
    e.preventDefault();
    console.warn('[renderer] WebGL context lost');
  };
  const onRestored = () => console.warn('[renderer] WebGL context restored');
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  // Fix bug intégration : `WebGLRenderer` n'a pas de `userData` par défaut
  // (cette propriété est spécifique à Object3D). On l'initialise explicitement
  // avant d'y attacher le détacheur de listeners pour ne pas planter avec
  // `Cannot set properties of undefined`.
  renderer.userData = renderer.userData ?? {};
  renderer.userData.detach = () => {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };

  return renderer;
}
