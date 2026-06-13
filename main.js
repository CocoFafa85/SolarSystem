/**
 * Point d'entrée — volontairement minimal.
 * Toute la logique vit dans /src.
 */
import { App } from './src/core/App.js';

const canvas = document.getElementById('solarCanvas');
const app = new App(canvas);
app.start();

// Exposition contrôlée pour debug en console (dev only).
if (import.meta.env?.DEV !== false) {
  window.__app = app;
}
