import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  solveKeplerEquation,
  trueAnomalyFromEccentric,
  heliocentricDistance,
} from '../src/physics/kepler.js';
import { TWO_PI } from '../src/physics/constants.js';

const EPS = 1e-9;

test('Kepler: orbite circulaire (e=0) → E = M', () => {
  // Arrange
  const M = 1.234;
  const e = 0;

  // Act
  const E = solveKeplerEquation(M, e);

  // Assert
  assert.ok(Math.abs(E - M) < EPS, `attendu ${M}, obtenu ${E}`);
});

test('Kepler: M = 0 → E = 0 quel que soit e', () => {
  for (const e of [0, 0.1, 0.5, 0.9, 0.99]) {
    const E = solveKeplerEquation(0, e);
    assert.ok(Math.abs(E) < EPS, `e=${e} → E=${E}`);
  }
});

test('Kepler: M = π → E = π quel que soit e (symétrie aphélie)', () => {
  for (const e of [0, 0.1, 0.5, 0.9, 0.99]) {
    const E = solveKeplerEquation(Math.PI, e);
    assert.ok(Math.abs(E - Math.PI) < 1e-8, `e=${e} → E=${E}`);
  }
});

test('Kepler: identité M = E - e·sin(E) vérifiée pour 50 échantillons', () => {
  // Arrange
  const e = 0.6;
  const samples = 50;

  // Act + Assert
  for (let k = 0; k < samples; k++) {
    const M = (k / samples) * TWO_PI;
    const E = solveKeplerEquation(M, e);
    const residual = E - e * Math.sin(E) - M;
    assert.ok(
      Math.abs(Math.sin(residual / 2)) < 1e-9,
      `residual=${residual} pour M=${M}`,
    );
  }
});

test('Kepler: M négatif est normalisé dans [0, 2π)', () => {
  // Arrange
  const e = 0.1;

  // Act
  const E = solveKeplerEquation(-Math.PI / 2, e);

  // Assert
  assert.ok(E >= 0 && E < TWO_PI, `E=${E} hors plage`);
});

test('Kepler: excentricité hors plage → RangeError', () => {
  assert.throws(() => solveKeplerEquation(1, -0.1), RangeError);
  assert.throws(() => solveKeplerEquation(1, 1), RangeError);
  assert.throws(() => solveKeplerEquation(1, 1.5), RangeError);
});

test('Anomalie vraie: ν = 0 au périhélie (E = 0)', () => {
  // Arrange / Act
  const nu = trueAnomalyFromEccentric(0, 0.5);

  // Assert
  assert.ok(Math.abs(nu) < EPS, `ν=${nu}`);
});

test('Anomalie vraie: ν = π à l\'aphélie (E = π)', () => {
  const nu = trueAnomalyFromEccentric(Math.PI, 0.5);
  assert.ok(Math.abs(nu - Math.PI) < EPS, `ν=${nu}`);
});

test('Distance héliocentrique: r = a(1-e) au périhélie', () => {
  // Arrange
  const a = 1.5;
  const e = 0.2;

  // Act
  const r = heliocentricDistance(a, e, 0);

  // Assert
  assert.ok(Math.abs(r - a * (1 - e)) < EPS, `r=${r}`);
});

test('Distance héliocentrique: r = a(1+e) à l\'aphélie', () => {
  const a = 1.5;
  const e = 0.2;
  const r = heliocentricDistance(a, e, Math.PI);
  assert.ok(Math.abs(r - a * (1 + e)) < EPS, `r=${r}`);
});
