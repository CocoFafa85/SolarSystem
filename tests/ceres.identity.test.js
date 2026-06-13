// LOT 10 — Identité unifiée de Cérès : planète naine UNIQUEMENT.
//
// Cause racine LOT 10 : Cérès apparaissait deux fois (asteroids.json + bodies.json)
// → BodyMenu dupliqué, orbite routée vers `cometOrbitsGroup` (toggle "minor")
// au lieu de `dwarfOrbitsGroup`, tooltip ambigu.
//
// Décision : Cérès = `dwarf_planet` au sens IAU 2006 (cf. bodies.json:199).
// asteroids.json doit en être expurgé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import { parseMinorBodies } from '../src/physics/minorBodyParser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASTEROIDS_PATH = join(__dirname, '..', 'asteroids.json');

test('Cérès — présent dans bodies.json en type "dwarf_planet"', async () => {
  const data = await loadBodiesFromFile();
  const ceres = data.bodies.ceres;
  assert.ok(ceres, 'ceres manquant dans bodies.json');
  assert.equal(ceres.type, 'dwarf_planet');
  assert.equal(ceres.name, 'Cérès');
});

test('Cérès — éléments orbitaux J2000 alignés JPL SBDB (±2 %)', async () => {
  const o = (await loadBodiesFromFile()).bodies.ceres.orbital;
  // Réf JPL SBDB : a ≈ 2.7675 UA, e ≈ 0.0758, i ≈ 10.59°
  assert.ok(Math.abs(o.semiMajorAxisAu - 2.7675) / 2.7675 < 0.02,
    `a=${o.semiMajorAxisAu} hors ±2% de 2.7675`);
  assert.ok(Math.abs(o.eccentricity - 0.0758) < 0.01,
    `e=${o.eccentricity} hors tolérance de 0.0758`);
  assert.ok(Math.abs(o.inclinationDeg - 10.59) < 0.5,
    `i=${o.inclinationDeg} hors tolérance de 10.59°`);
});

test('Cérès — période orbitale ≈ 4.60 ans (±2 %)', async () => {
  const o = (await loadBodiesFromFile()).bodies.ceres.orbital;
  // 3e loi de Kepler en unités héliocentriques : T² = a³ (T en années, a en UA).
  const periodYears = Math.sqrt(o.semiMajorAxisAu ** 3);
  const expected = 4.60;
  assert.ok(Math.abs(periodYears - expected) / expected < 0.02,
    `période=${periodYears.toFixed(3)} ans hors ±2% de ${expected}`);
});

test('Cérès — ABSENT de asteroids.json (pas de double identité)', async () => {
  const raw = JSON.parse(await readFile(ASTEROIDS_PATH, 'utf8'));
  assert.equal(raw.ceres, undefined,
    'ceres ne doit plus être déclaré dans asteroids.json (cf. LOT 10)');
  const parsed = parseMinorBodies(raw);
  assert.equal(parsed.find?.(b => b.id === 'ceres'), undefined,
    'parseMinorBodies ne doit retourner aucun corps "ceres"');
});

test('Cérès — Vesta et Pallas restent dans asteroids.json (régression à éviter)', async () => {
  const raw = JSON.parse(await readFile(ASTEROIDS_PATH, 'utf8'));
  assert.ok(raw.pallas, 'pallas doit rester dans asteroids.json');
  assert.ok(raw.vesta, 'vesta doit rester dans asteroids.json');
});
