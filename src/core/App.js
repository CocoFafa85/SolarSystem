import { createRenderer } from './Renderer.js';
import { createCamera } from './Camera.js';
import { createScene } from './Scene.js';

/**
 * Bootstrap & boucle d'animation centrale.
 *
 * Zéro-Allocation : aucune instanciation d'objet Three.js dans `#tick`.
 * Les modules logiques (Session B, D) doivent enregistrer leurs updaters via
 * `registerUpdater(fn)` ; chaque updater reçoit `(deltaSeconds, elapsedSeconds)`.
 */
export class App {
  #renderer;
  #scene;
  #camera;
  #updaters = [];
  #rafId = null;
  #lastTime = 0;
  #elapsed = 0;
  #onResize;

  constructor(canvas) {
    if (!canvas) throw new Error('App: canvas DOM element requis.');
    this.#renderer = createRenderer(canvas);
    this.#scene = createScene();
    this.#camera = createCamera();

    this.#onResize = this.#handleResize.bind(this);
    window.addEventListener('resize', this.#onResize, { passive: true });
  }

  get scene() { return this.#scene; }
  get camera() { return this.#camera; }
  get renderer() { return this.#renderer; }

  registerUpdater(fn) {
    if (typeof fn !== 'function') throw new TypeError('updater doit être une fonction.');
    this.#updaters.push(fn);
  }

  start() {
    if (this.#rafId !== null) return;
    this.#lastTime = performance.now();
    this.#rafId = requestAnimationFrame(this.#tick);
  }

  stop() {
    if (this.#rafId === null) return;
    cancelAnimationFrame(this.#rafId);
    this.#rafId = null;
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.#onResize);
    this.#renderer.dispose();
    this.#updaters.length = 0;
  }

  #tick = (now) => {
    const dt = (now - this.#lastTime) * 0.001;
    this.#lastTime = now;
    this.#elapsed += dt;

    for (let i = 0; i < this.#updaters.length; i++) {
      this.#updaters[i](dt, this.#elapsed);
    }

    this.#renderer.render(this.#scene, this.#camera);
    this.#rafId = requestAnimationFrame(this.#tick);
  };

  #handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.#camera.aspect = w / h;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(w, h, false);
  }
}
