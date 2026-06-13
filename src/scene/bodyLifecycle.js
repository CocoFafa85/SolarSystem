// Cycle de vie GPU des corps célestes — PLAN.md LOT 3 Profile C.
//
// Trois opérations supportées :
//   1. disposeCelestialBody(node, cache, manifest)
//        → libère récursivement géométries + matériaux + textures du node,
//          décrémente les refs dans le TextureCache si on connaît les paths.
//   2. removeBody(systemRoot, id, cache, manifest)
//        → détache l'astre de son parent ET de la scene graph, puis dispose.
//   3. replaceBodyTexture(node, slot, newPath, cache)
//        → swap atomique d'une map (map / emissiveMap), release de l'ancienne,
//          rebind sur tous les matériaux qui la portaient via `.traverse()`.
//
// Invariants Profile C :
//   - Toujours utiliser `.traverse()` pour ne rater aucun enfant (anneaux, halos…).
//   - Toujours décrémenter le refcount du cache pour éviter les doubles `dispose()`.
//   - Aucun objet temporaire alloué par appel (réutilisation du SCRATCH_TEX_KEYS).

import { getManifest } from '../assets/textureManifest.js';

// Slots de texture standard scannés sur chaque matériau. Étendre si LOT 4 ajoute
// des normalMap / roughnessMap / etc. — surtout PAS dans la RAF.
const SCRATCH_TEX_KEYS = [
  'map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap',
  'aoMap', 'bumpMap', 'displacementMap', 'alphaMap', 'specularMap',
];

function collectTexturePaths(manifest) {
  if (!manifest) return null;
  const paths = [];
  if (manifest.map) paths.push(manifest.map);
  if (manifest.nightMap) paths.push(manifest.nightMap);
  if (manifest.ring?.texture) paths.push(manifest.ring.texture);
  return paths.length ? paths : null;
}

function disposeMaterialDeep(mat) {
  if (!mat) return;
  for (let i = 0; i < SCRATCH_TEX_KEYS.length; i++) {
    const k = SCRATCH_TEX_KEYS[i];
    const tex = mat[k];
    if (tex && tex.isTexture) {
      tex.dispose();
      // Le matériau peut référencer la même texture ailleurs ; on null-ise
      // pour bloquer un second dispose côté WebGLRenderer.
      mat[k] = null;
    }
  }
  if (mat.uniforms) {
    for (const u of Object.values(mat.uniforms)) {
      if (u && u.value && u.value.isTexture) u.value.dispose();
    }
  }
  mat.dispose();
}

/**
 * Libère un sous-arbre d'astre (sphère + anneaux + tilt + éventuels satellites).
 * @param {import('three').Object3D} node
 * @param {{ cache?: import('../assets/TextureCache.js').TextureCache,
 *           releaseTextures?: boolean }} [opts]
 *   `releaseTextures` (true par défaut) déclenche `cache.release(path)` pour
 *   chaque texture du manifeste — préférable au double-dispose direct quand un
 *   autre astre référence la même map.
 */
export function disposeCelestialBody(node, opts = {}) {
  if (!node) return;
  const releaseTextures = opts.releaseTextures !== false;
  const cache = opts.cache ?? null;

  // 1) Release des textures partagées via le manifeste, AVANT de tout détruire.
  if (releaseTextures && cache && node.userData?.id) {
    const paths = collectTexturePaths(getManifest(node.userData.id));
    if (paths) for (let i = 0; i < paths.length; i++) cache.release(paths[i]);
  }

  // 2) Traversal complet : géométries + matériaux des sphère/ring/satellites.
  node.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
      child.geometry = null;
    }
    const m = child.material;
    if (Array.isArray(m)) {
      for (let i = 0; i < m.length; i++) disposeMaterialDeep(m[i]);
    } else {
      disposeMaterialDeep(m);
    }
    child.material = null;
  });

  // 3) Détache du parent — DERNIER pour ne pas couper la traversée en cours.
  if (node.parent) node.parent.remove(node);
}

/**
 * Retire un astre par id. Cherche dans systemRoot (récursivement) — utile pour
 * la Lune dont le parent est `earth`, pas `systemRoot`.
 * @param {import('three').Object3D} systemRoot
 * @param {string} id
 * @param {import('../assets/TextureCache.js').TextureCache} [cache]
 * @returns {boolean} true si l'astre a été retiré.
 */
export function removeBody(systemRoot, id, cache) {
  if (!systemRoot || !id) return false;
  let target = null;
  systemRoot.traverse((obj) => {
    if (!target && obj.userData?.id === id) target = obj;
  });
  if (!target) return false;
  disposeCelestialBody(target, { cache });
  return true;
}

/**
 * Remplace une texture (par ex. mise à jour albedo Soleil HD vs SD) sur tous
 * les matériaux du sous-arbre qui portent ce slot. L'ancienne texture est
 * libérée via `cache.release(oldPath)`.
 *
 * @param {import('three').Object3D} node
 * @param {string} slot  l'un de SCRATCH_TEX_KEYS
 * @param {string} oldPath
 * @param {import('three').Texture} newTexture déjà chargée
 * @param {import('../assets/TextureCache.js').TextureCache} cache
 */
export function replaceBodyTexture(node, slot, oldPath, newTexture, cache) {
  if (!node || !slot || !newTexture) return;
  if (!SCRATCH_TEX_KEYS.includes(slot)) {
    throw new RangeError(`replaceBodyTexture: slot inconnu "${slot}"`);
  }
  node.traverse((child) => {
    const m = child.material;
    if (!m) return;
    const materials = Array.isArray(m) ? m : [m];
    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      if (mat[slot] && mat[slot].isTexture) {
        mat[slot] = newTexture;
        mat.needsUpdate = true;
      }
    }
  });
  if (cache && oldPath) cache.release(oldPath);
}

/**
 * Bascule la visibilité d'un astre (UI LOT 3 « Masquer le Soleil »).
 * Pas de dispose — l'astre reste en mémoire prêt à réapparaître. Aucun mesh
 * caché n'est rendu : Three.js court-circuite la branche au render.
 */
export function setBodyVisible(node, visible) {
  if (node) node.visible = !!visible;
}

/**
 * Libère un CometSystem (LOT 4) sans double-disposer les ressources partagées.
 *
 * `CometSystem.js` stocke `sharedGeom` et `sharedMat` dans `root.userData` et
 * les attache à chaque nucleus. Un `traverse` naïf appellerait `dispose()`
 * sur la même `BufferGeometry` autant de fois qu'il y a de nucléus.
 * On marque chaque ressource déjà disposée via un WeakSet local.
 *
 * @param {import('three').Object3D} root  retour de `createCometSystem().root`
 */
export function disposeCometSystem(root) {
  if (!root) return;
  const seenGeom = new WeakSet();
  const seenMat = new WeakSet();

  root.traverse((child) => {
    if (child.geometry && !seenGeom.has(child.geometry)) {
      child.geometry.dispose();
      seenGeom.add(child.geometry);
    }
    const m = child.material;
    const list = Array.isArray(m) ? m : (m ? [m] : []);
    for (let i = 0; i < list.length; i++) {
      const mat = list[i];
      if (mat && !seenMat.has(mat)) {
        disposeMaterialDeep(mat);
        seenMat.add(mat);
      }
    }
    child.geometry = null;
    child.material = null;
  });

  // Les refs userData (sharedGeom/sharedMat) sont déjà disposées via le traverse
  // (elles sont attachées aux Mesh nucleus). On les efface pour aider le GC.
  if (root.userData) {
    root.userData.sharedGeom = null;
    root.userData.sharedMat = null;
  }
  if (root.parent) root.parent.remove(root);
}
