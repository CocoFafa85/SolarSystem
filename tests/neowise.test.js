// LOT 8 — Validation Profile B : Neowise (C/2020 F3) au catalogue comètes.
// Source de référence : JPL Small-Body Database (https://ssd.jpl.nasa.gov).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getComets, ION_TRAIL_COMETS } from '../src/data/cometsCatalog.js';
import { orbitalPeriodDays } from '../src/physics/orbital.js';

function findById(id) {
  return getComets().find((c) => c.id === id);
}

test('Neowise est présente au catalogue', () => {
  // Arrange / Act
  const c = findById('neowise');
  // Assert
  assert.ok(c, 'neowise absent du catalogue');
  assert.equal(c.type, 'comet');
});

test('Neowise : périhélie ≈ 0.295 UA (tolérance ±0.01 UA)', () => {
  // Arrange
  const o = findById('neowise').orbital;
  // Act : q = a × (1 − e)
  const perihelion = o.semiMajorAxisAu * (1 - o.eccentricity);
  // Assert
  assert.ok(Math.abs(perihelion - 0.295) < 0.01,
    `périhélie = ${perihelion.toFixed(4)} UA`);
});

test('Neowise : période orbitale > 5000 ans (orbite quasi-parabolique)', () => {
  // Arrange
  const o = findById('neowise').orbital;
  // Act
  const T_days = orbitalPeriodDays(o.semiMajorAxisAu);
  const T_years = T_days / 365.25;
  // Assert : valeur de référence ≈ 6766 ans
  assert.ok(T_years > 5000, `période = ${T_years.toFixed(0)} ans`);
  assert.ok(T_years < 8000, `période = ${T_years.toFixed(0)} ans (trop grande)`);
});

test('Neowise : inclinaison rétrograde (i > 90°)', () => {
  // Arrange
  const o = findById('neowise').orbital;
  // Act + Assert : i = 128.93° → mouvement rétrograde
  assert.ok(o.inclinationDeg > 90 && o.inclinationDeg < 180,
    `i = ${o.inclinationDeg}°`);
});

test('Neowise : excentricité extrême (e > 0.99, quasi-parabolique)', () => {
  const o = findById('neowise').orbital;
  assert.ok(o.eccentricity > 0.99 && o.eccentricity < 1,
    `e = ${o.eccentricity}`);
});

test('Neowise : éléments orbitaux dans les plages JPL SBDB de référence', () => {
  // Arrange / Act
  const o = findById('neowise').orbital;
  // Assert : tolérances larges (catalogue à jour, valeurs JPL fluctuent légèrement)
  assert.ok(o.semiMajorAxisAu > 300 && o.semiMajorAxisAu < 400,
    `a = ${o.semiMajorAxisAu}`);
  assert.ok(o.longitudeAscendingNodeDeg > 60 && o.longitudeAscendingNodeDeg < 62,
    `Ω = ${o.longitudeAscendingNodeDeg}`);
  assert.ok(o.argumentPerihelionDeg > 36 && o.argumentPerihelionDeg < 38,
    `ω = ${o.argumentPerihelionDeg}`);
});

test('Neowise : drapeau ionTrail actif (queue plasma bleue)', () => {
  assert.ok(ION_TRAIL_COMETS.has('neowise'),
    'neowise absente de ION_TRAIL_COMETS');
});

test('Neowise : structure physique valide (rayon nucleus défini, masse optionnelle)', () => {
  const c = findById('neowise');
  assert.ok(c.physical.radiusAu > 0,
    `radiusAu = ${c.physical.radiusAu}`);
  // mass peut être null (mal contrainte) ; OK pour une comète.
});

test('Aucun corps "neowise" en double dans bodies.json (catalogue distinct)', async () => {
  // Arrange : Neowise vit dans cometsCatalog.js (catalogue mineur), pas dans
  // bodies.json (réservé aux corps majeurs et planètes naines).
  const { loadBodiesFromFile } = await import('../src/physics/bodyLoader.js');
  const data = await loadBodiesFromFile();
  assert.ok(!data.bodies.neowise, 'neowise ne doit pas être dans bodies.json');
});
