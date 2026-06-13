import * as THREE from 'three';

// Pool de scratch objects — Zero-Allocation dans requestAnimationFrame.
// Règle PROJECT.md §3 : aucune instanciation `new THREE.*` dans la RAF.
// Les autres sessions (B physique, D UI) DOIVENT importer ces refs au lieu de `new`.

export const v3 = Object.freeze({
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  c: new THREE.Vector3(),
  d: new THREE.Vector3(),
});

export const v2 = Object.freeze({
  a: new THREE.Vector2(),
  b: new THREE.Vector2(),
});

export const quat = Object.freeze({
  a: new THREE.Quaternion(),
  b: new THREE.Quaternion(),
});

export const mat4 = Object.freeze({
  a: new THREE.Matrix4(),
  b: new THREE.Matrix4(),
});

export const color = Object.freeze({
  a: new THREE.Color(),
});

// Sentinelle de dev : si quelqu'un fait `pool.v3.a = new Vector3()` -> TypeError.
// (Object.freeze sur le namespace empêche la réaffectation des slots.)
