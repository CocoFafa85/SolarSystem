// LOT 12 — Audit strict des rayons physiques `radius_au` pour l'échelle 1:1.
//
// À l'échelle 1:1 (LOT 12), toute erreur de saisie ×10 dans `radius_au` est
// visible à l'œil. Ce test verrouille les rayons à ±1 % de la valeur de
// référence NASA Planetary Fact Sheet (rayon moyen volumétrique).
//
// Référence : https://nssdc.gsfc.nasa.gov/planetary/factsheet/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';

const AU_KM = 149597870.7;

// Rayons moyens NASA en km (Planetary Fact Sheet — rayon volumétrique sauf
// indication). Cérès : rayon moyen JPL SBDB. Lune : NASA Moon Fact Sheet.
const NASA_RADIUS_KM = {
  sun:     695700,
  mercury:   2439.7,
  venus:     6051.8,
  earth:     6371.0,
  moon:      1737.4,
  mars:      3389.5,
  jupiter:  69911,
  saturn:   58232,
  uranus:   25362,
  neptune:  24622,
  pluto:     1188.3,
  ceres:      469.7,
};

const TOLERANCE = 0.01; // ±1 %

test('bodies.json — radius_au de chaque corps à ±1 % du rayon NASA', async () => {
  const data = await loadBodiesFromFile();
  const failures = [];
  for (const [id, refKm] of Object.entries(NASA_RADIUS_KM)) {
    const body = data.bodies[id];
    assert.ok(body, `Corps ${id} manquant dans bodies.json`);
    const rAu = body.physical.radiusAu;
    assert.ok(Number.isFinite(rAu) && rAu > 0,
      `${id}: radiusAu non fini ou non positif (${rAu})`);
    const km = rAu * AU_KM;
    const relErr = Math.abs(km - refKm) / refKm;
    if (relErr > TOLERANCE) {
      failures.push(
        `${id}: ${km.toFixed(1)} km vs NASA ${refKm} km (${(relErr * 100).toFixed(2)} %)`,
      );
    }
  }
  assert.deepEqual(failures, [],
    `Rayons hors tolérance ±1 % :\n  ${failures.join('\n  ')}`);
});

test('bodies.json — aucun radius_au absurde (gardes ×10)', async () => {
  const data = await loadBodiesFromFile();
  // Plancher : Cérès ≈ 3e-6 UA. Plafond : Soleil ≈ 5e-3 UA. Tout ce qui sort
  // de [1e-7, 1e-2] UA est suspect (typo ×10 ou unité confondue).
  for (const [id, body] of Object.entries(data.bodies)) {
    const r = body.physical.radiusAu;
    assert.ok(r > 1e-7 && r < 1e-2,
      `${id}: radiusAu=${r} hors plage physique [1e-7, 1e-2] UA`);
  }
});
