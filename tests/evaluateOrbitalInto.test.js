import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  orbitalElementsToHeliocentric,
  evaluateOrbitalElementsInto,
} from '../src/physics/orbital.js';
import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';

test('evaluateOrbitalElementsInto: sans buffer → TypeError', () => {
  assert.throws(
    () => evaluateOrbitalElementsInto({ semiMajorAxisAu: 1, eccentricity: 0,
      inclinationDeg: 0, longitudeAscendingNodeDeg: 0,
      argumentPerihelionDeg: 0, meanAnomalyDeg: 0 }, undefined),
    TypeError,
  );
});

test('Buffer fourni : même référence retournée', () => {
  // Arrange
  const out = { x: 0, y: 0, z: 0, r: 0, trueAnomaly: 0 };
  const el = { semiMajorAxisAu: 1, eccentricity: 0, inclinationDeg: 0,
    longitudeAscendingNodeDeg: 0, argumentPerihelionDeg: 0, meanAnomalyDeg: 0 };
  // Act
  const r = evaluateOrbitalElementsInto(el, out);
  // Assert
  assert.equal(r, out);
});

test('Parité fonctionnelle : Into produit les MÊMES valeurs que la version alloue', async () => {
  // Arrange : toutes les planètes du bodies.json
  const data = await loadBodiesFromFile();
  const out = { x: 0, y: 0, z: 0, r: 0, trueAnomaly: 0 };
  // Act + Assert
  for (const id of Object.keys(data.bodies)) {
    const body = data.bodies[id];
    if (!body.orbital) continue;
    const allocated = orbitalElementsToHeliocentric(body.orbital);
    evaluateOrbitalElementsInto(body.orbital, out);
    assert.ok(Math.abs(allocated.x - out.x) < 1e-15, `${id} x`);
    assert.ok(Math.abs(allocated.y - out.y) < 1e-15, `${id} y`);
    assert.ok(Math.abs(allocated.z - out.z) < 1e-15, `${id} z`);
    assert.ok(Math.abs(allocated.r - out.r) < 1e-15, `${id} r`);
    assert.ok(Math.abs(allocated.trueAnomaly - out.trueAnomaly) < 1e-15, `${id} ν`);
  }
});

test('Zéro-alloc : 50 000 appels conservent la référence du buffer', () => {
  // Arrange
  const out = { x: 0, y: 0, z: 0, r: 0, trueAnomaly: 0 };
  const el = { semiMajorAxisAu: 1.5, eccentricity: 0.1, inclinationDeg: 5,
    longitudeAscendingNodeDeg: 30, argumentPerihelionDeg: 60, meanAnomalyDeg: 0 };
  // Act + Assert
  for (let i = 0; i < 50000; i++) {
    el.meanAnomalyDeg = (i * 0.123) % 360;
    const r = evaluateOrbitalElementsInto(el, out);
    assert.equal(r, out);
  }
});

test('Aucune régression sur orbitalElementsToHeliocentric (cas classiques)', async () => {
  // Arrange / Act
  const data = await loadBodiesFromFile();
  const p = orbitalElementsToHeliocentric(data.bodies.earth.orbital);
  // Assert : Terre à ~1 UA
  const a = data.bodies.earth.orbital.semiMajorAxisAu;
  const e = data.bodies.earth.orbital.eccentricity;
  assert.ok(p.r >= a * (1 - e) - 1e-9);
  assert.ok(p.r <= a * (1 + e) + 1e-9);
});
