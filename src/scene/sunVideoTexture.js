import * as THREE from 'three';

// LOT 12B — VideoTexture pour le Soleil (animation plasma `textures/sun.mp4`).
//
// Pattern hérité de `main_V1.js` lignes 40-50 : <video> détaché DOM, loop,
// muted (requis pour autoplay sans interaction), playbackRate 0.5 (ralenti).
// Wrapper ESM qui :
//   - garde-fou réseau lent : `navigator.connection.effectiveType in [slow-2g, 2g]`
//   - garde-fou accessibilité : `prefers-reduced-motion: reduce`
//   - garde-fou autoplay : `video.play()` peut rejeter (politique navigateur)
//   - garde-fou onglet caché : pause sur `visibilitychange → hidden`
//   - dispose : retire les listeners, pause + clear src + texture.dispose()
//
// Retour : `Promise<{ texture, video, dispose } | null>` ; `null` = fallback
// silencieux vers la texture statique de SystemBuilder (sun.jpg).

const VIDEO_PATH = 'textures/sun.mp4';
const PLAYBACK_RATE = 0.5;

function isReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isSlowConnection() {
  if (typeof navigator === 'undefined' || !navigator.connection) return false;
  const t = navigator.connection.effectiveType;
  return t === 'slow-2g' || t === '2g';
}

/**
 * @returns {Promise<{ texture: THREE.VideoTexture, video: HTMLVideoElement, dispose: () => void } | null>}
 */
export async function createSunVideoTexture() {
  if (typeof document === 'undefined') return null;
  if (isReducedMotion()) return null;
  if (isSlowConnection())  return null;

  const video = document.createElement('video');
  video.src = VIDEO_PATH;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.preload = 'auto';
  video.playbackRate = PLAYBACK_RATE;

  // Tentative d'autoplay. Si rejet (politique navigateur, pas d'interaction
  // utilisateur, format non supporté…) → null, le caller fallback sur la
  // texture statique. Aucun side-effect persistant.
  try {
    await video.play();
  } catch (err) {
    console.warn('[sunVideoTexture] autoplay refusé, fallback sun.jpg', err);
    video.src = '';
    return null;
  }

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  // Pause vidéo quand l'onglet est caché — économie CPU/GPU/batterie.
  // Listener nommé pour cleanup.
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      video.pause();
    } else {
      video.play().catch(() => { /* déjà en cours ou refusé : ignorer */ });
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    try { video.pause(); } catch { /* ignore */ }
    video.removeAttribute('src');
    video.load(); // force le release des décodeurs WebMedia
    texture.dispose();
  }

  return { texture, video, dispose };
}
