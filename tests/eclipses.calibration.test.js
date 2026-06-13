// Calibration LOT 6 — sur 10 ans simulés depuis J2000, le tracker doit
// rapporter un nombre d'éclipses solaires et lunaires proche de la valeur
// astronomique (≈ 23 solaires et ≈ 23 lunaires sur 10 ans, tolérance ±2).
//
// Référence : NASA Eclipse Catalog 5000 → ~24 éclipses solaires et
// ~23 éclipses lunaires (incluant les pénombrales) par décennie au XXIe s.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createEclipseTracker } from '../src/physics/eclipses.js';
import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import { HOURS_PER_YEAR } from '../src/physics/constants.js';

test('Sur 10 ans : ≈ 23 solaires + ≈ 23 lunaires (±2)', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const tracker = createEclipseTracker({
    earthElements: data.bodies.earth.orbital,
    moonElements: data.bodies.moon.orbital,
    sunRadiusAu: data.bodies.sun.physical.radiusAu,
    earthRadiusAu: data.bodies.earth.physical.radiusAu,
    moonRadiusAu: data.bodies.moon.physical.radiusAu,
    maxStepHours: 1, // pas suffisamment fin
  });

  // Act
  tracker.advance(10 * HOURS_PER_YEAR);
  const c = tracker.getCounters();

  // Assert : tolérance ±2 autour de 23.
  // Si le compteur sort fortement, c'est un signal pour auditer maxStepHours,
  // les seuils de classify*, ou la propagation lunaire (µ_⊕).
  const target = 23;
  const tol = 2;
  assert.ok(Math.abs(c.solar - target) <= tol,
    `solar=${c.solar} hors [${target - tol}, ${target + tol}]`);
  assert.ok(Math.abs(c.lunar - target) <= tol,
    `lunar=${c.lunar} hors [${target - tol}, ${target + tol}]`);
});
