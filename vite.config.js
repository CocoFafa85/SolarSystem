import { defineConfig } from 'vite';

// LOT 14 — Build production pour GitHub Pages.
// Repo : https://github.com/cocofafa85/SolarSystem
// URL  : https://cocofafa85.github.io/SolarSystem/
//
// `base` est CRITIQUE : sans le préfixe, les imports ES modules cassent
// (404 sur `/assets/index-XXX.js` au lieu de `/SolarSystem/assets/...`).
//
// `publicDir` désactivé : les assets statiques (textures/, locales/, data/,
// bodies.json, asteroids.json) restent à la racine du repo pour préserver
// les tests Node (`tests/bodies.scale.test.js` lit `bodies.json` via fs).
// Le script `scripts/copy-assets.mjs` les copie dans `dist/` post-build.
export default defineConfig({
  base: '/SolarSystem/',
  publicDir: false,
  server: {
    port: 5173,
    host: 'localhost',
    open: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',   // top-level await utilisé dans main.js (await bootUI())
  },
});
