// LOT 14 — post-build : copie les assets statiques (laissés à la racine du
// repo pour les tests Node) vers `dist/`. Vite gère seulement `index.html` +
// les modules JS importés ; les fetch()/`<img src>` runtime ont besoin des
// fichiers à côté du bundle servi.

import { cp, mkdir, copyFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const DIRS = ['textures', 'locales', 'data'];
const FILES = ['bodies.json', 'asteroids.json', '404.html', 'favicon.svg'];

async function copyDir(name) {
  const src = join(ROOT, name);
  if (!existsSync(src)) {
    console.warn(`[copy-assets] skip "${name}/" (introuvable)`);
    return;
  }
  const dst = join(DIST, name);
  await mkdir(dst, { recursive: true });
  await cp(src, dst, { recursive: true });
  console.log(`[copy-assets] ${name}/ → dist/${name}/`);
}

async function copyOne(name) {
  const src = join(ROOT, name);
  if (!existsSync(src)) {
    console.warn(`[copy-assets] skip "${name}" (introuvable)`);
    return;
  }
  await copyFile(src, join(DIST, name));
  console.log(`[copy-assets] ${name} → dist/${name}`);
}

if (!existsSync(DIST)) {
  console.error('[copy-assets] dist/ inexistant — lancer `vite build` d\'abord');
  process.exit(1);
}

await Promise.all([
  ...DIRS.map(copyDir),
  ...FILES.map(copyOne),
]);
console.log('[copy-assets] terminé');
