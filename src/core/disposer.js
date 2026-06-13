import * as THREE from 'three';

// Nettoyage récursif GPU — PROJECT.md §2.
// Retire `root` de son parent, libère géométries, matériaux, textures et render targets.

function disposeMaterial(mat) {
  if (!mat) return;
  for (const key of Object.keys(mat)) {
    const val = mat[key];
    if (val && val.isTexture) val.dispose();
  }
  if (mat.uniforms) {
    for (const u of Object.values(mat.uniforms)) {
      if (u && u.value && u.value.isTexture) u.value.dispose();
    }
  }
  mat.dispose();
}

export function disposeObject(root) {
  if (!root) return;

  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const m = obj.material;
    if (Array.isArray(m)) m.forEach(disposeMaterial);
    else disposeMaterial(m);
  });

  if (root.parent) root.parent.remove(root);
}

export function disposeScene(scene) {
  // Détache enfants en ordre inverse pour éviter mutation pendant itération.
  for (let i = scene.children.length - 1; i >= 0; i--) {
    disposeObject(scene.children[i]);
  }
  if (scene.background && scene.background.isTexture) scene.background.dispose();
  if (scene.environment && scene.environment.isTexture) scene.environment.dispose();
}
