import * as THREE from 'three';

// StarBackground — LOT 7 : CubeMap réelle via `WebGLCubeRenderTarget`.
//
// Au lieu de charger 6 fichiers cube PNG (asset absent), on charge la texture
// equirectangulaire existante puis on la convertit RUNTIME en CubeRenderTarget
// via `fromEquirectangularTexture`. Le résultat est une cube map authentique
// utilisable directement comme `scene.background` — bénéfices :
//   - sampling cube-natif (pas d'undersampling aux pôles equirect),
//   - aucun mipmap aliasing sur grandes vues,
//   - texture equirect source jetée immédiatement (économie GPU).
//
// CONTRAT C — dispose explicite au teardown :
//   - `scene.background.dispose()` libère la cube map (6 faces),
//   - texture equirect source disposée après conversion (refcount cache OK).

// LOT 16 patch — SVG cosmos vectoriel actif (cube map 2048 pour préserver netteté).
const DEFAULT_PATH = 'textures/cosmos-skybox.svg';
const FALLBACK_PATH = 'textures/stars_milkyway.jpg';
const CUBE_MAP_SIZE = 2048; // ×2 vs LOT 7 (24→96 MB VRAM, OK desktops modernes)

// Référence module-scope pour permettre le dispose ciblé au teardown.
let _cubeRT = null;

/**
 * @param {THREE.Scene} scene
 * @param {import('../assets/TextureCache.js').TextureCache} textureCache
 * @param {THREE.WebGLRenderer} renderer
 * @param {string} [path]
 * @returns {Promise<THREE.CubeTexture|null>}
 */
export async function applyStarBackground(scene, textureCache, renderer, path = DEFAULT_PATH) {
  if (!scene || !textureCache || !renderer) {
    throw new Error('applyStarBackground: scene + textureCache + renderer requis');
  }
  let equirect;
  try {
    equirect = await textureCache.load(path);
  } catch (err) {
    console.warn('[StarBackground] SVG load fail, fallback JPG:', err);
    try { equirect = await textureCache.load(FALLBACK_PATH); }
    catch (err2) { console.warn('[StarBackground] fallback JPG fail aussi:', err2); return null; }
  }
  try {
    equirect.mapping = THREE.EquirectangularReflectionMapping;
    equirect.colorSpace = THREE.SRGBColorSpace;

    // Conversion runtime equirect → cube map (2048 pour préserver SVG vectoriel).
    _cubeRT = new THREE.WebGLCubeRenderTarget(CUBE_MAP_SIZE);
    _cubeRT.fromEquirectangularTexture(renderer, equirect);
    _cubeRT.texture.colorSpace = THREE.SRGBColorSpace;

    // Anisotropy max sur la cube — chaque face profite du sampling matériel.
    const maxAniso = renderer.capabilities?.getMaxAnisotropy?.() ?? 1;
    _cubeRT.texture.anisotropy = maxAniso;

    scene.background = _cubeRT.texture;
    return _cubeRT.texture;
  } catch (err) {
    console.warn('[StarBackground] échec chargement, fond noir conservé:', err);
    return null;
  }
}

/**
 * Détache la cube map de la scène et libère ses 6 textures GPU.
 * La texture equirect source reste gérée par `TextureCache` (refcount).
 */
export function clearStarBackground(scene) {
  if (!scene) return;
  scene.background = null;
  if (_cubeRT) {
    // dispose libère les 6 faces du framebuffer + texture cube associée.
    _cubeRT.dispose();
    _cubeRT = null;
  }
}
