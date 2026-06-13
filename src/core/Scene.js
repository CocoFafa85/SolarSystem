import * as THREE from 'three';

/**
 * Scène vide — les corps célestes seront ajoutés par les modules LOT 3.
 * Repère écliptique XY (Z = pôle nord), aligné sur la convention héliocentrique
 * de Session B (`src/physics/orbital.js`).
 */
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  return scene;
}
