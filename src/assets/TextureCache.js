import * as THREE from 'three';

// Cache de textures partagé — évite les doublons GPU et centralise le dispose.
// Profile C : `disposeAll()` est appelé depuis le teardown global de main.js.
//
// Chaque entrée mémorise sa colorSpace cible : SRGB pour les albedo/émissifs,
// NoColorSpace pour les data maps (normal, roughness, height) à venir.

const DEFAULT_LOADER = new THREE.TextureLoader();

export class TextureCache {
  #loader;
  #entries = new Map();   // path -> { texture, refs }
  #pending = new Map();   // path -> Promise<Texture>

  constructor(loader = DEFAULT_LOADER) {
    this.#loader = loader;
  }

  /**
   * Charge (ou récupère du cache) une texture.
   * @param {string} path
   * @param {{colorSpace?: string, anisotropy?: number}} [opts]
   * @returns {Promise<THREE.Texture>}
   */
  load(path, opts = {}) {
    if (!path) return Promise.reject(new Error('TextureCache.load: path requis'));

    const cached = this.#entries.get(path);
    if (cached) {
      cached.refs += 1;
      return Promise.resolve(cached.texture);
    }
    const inflight = this.#pending.get(path);
    if (inflight) {
      // Profile C — fix : chaque load() concurrent doit incrémenter le compteur
      // de refs après résolution, sinon release() libère prématurément.
      return inflight.then((texture) => {
        const entry = this.#entries.get(path);
        if (entry) entry.refs += 1;
        return texture;
      });
    }

    const promise = new Promise((resolve, reject) => {
      this.#loader.load(
        path,
        (texture) => {
          texture.colorSpace = opts.colorSpace ?? THREE.SRGBColorSpace;
          if (opts.anisotropy) texture.anisotropy = opts.anisotropy;
          texture.needsUpdate = true;
          this.#entries.set(path, { texture, refs: 1 });
          this.#pending.delete(path);
          resolve(texture);
        },
        undefined,
        (err) => {
          this.#pending.delete(path);
          reject(new Error(`TextureCache: échec chargement "${path}" (${err?.message ?? err})`));
        },
      );
    });

    this.#pending.set(path, promise);
    return promise;
  }

  /** Décrémente le compteur ; libère la texture quand plus aucune référence ne pointe dessus. */
  release(path) {
    const entry = this.#entries.get(path);
    if (!entry) return;
    entry.refs -= 1;
    if (entry.refs <= 0) {
      entry.texture.dispose();
      this.#entries.delete(path);
    }
  }

  /** Libère tout. À appeler au teardown global uniquement. */
  disposeAll() {
    for (const entry of this.#entries.values()) entry.texture.dispose();
    this.#entries.clear();
    this.#pending.clear();
  }

  get size() { return this.#entries.size; }
}
