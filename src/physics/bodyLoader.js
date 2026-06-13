// Wrapper Node-only autour du parseur pur (bodyParser.js).
// La logique de normalisation a été extraite pour être consommable côté navigateur
// via fetch — `node:fs` ferait planter la résolution ESM dans le browser.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { normalizeBody, parseBodies } from './bodyParser.js';

export { normalizeBody, parseBodies };

/**
 * Charge bodies.json depuis le disque (Node) et retourne la liste normalisée.
 * @param {string} [filePath] chemin absolu ou relatif au projet
 */
export async function loadBodiesFromFile(filePath) {
  const resolved = filePath
    ?? path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..', '..', 'bodies.json',
    );
  const text = await readFile(resolved, 'utf8');
  return parseBodies(JSON.parse(text));
}
