import * as THREE from 'three';
import { CAMERA } from '../config/render.config.js';

/**
 * Caméra perspective avec plans de coupe extrêmes (near 1e-5, far 1e3 UA),
 * indispensables pour observer des rayons planétaires < 1e-4 UA sans
 * basculer sur des distances inter-orbitales de plusieurs dizaines d'UA.
 */
export function createCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    aspect,
    CAMERA.near,
    CAMERA.far,
  );

  const { x, y, z } = CAMERA.initialPosition;
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);

  return camera;
}
