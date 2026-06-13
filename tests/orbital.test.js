import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  orbitalElementsToHeliocentric,
  meanMotionRadPerDay,
  orbitalPeriodDays,
  propagateMeanAnomaly,
} from '../src/physics/orbital.js';

const EPS_POS = 1e-9;
const EPS_DIST = 1e-9;

/** Construit un jeu d'éléments orbitaux par défaut, surchargeable. */
function makeElements(overrides = {}) {
  return {
    semiMajorAxisAu: 1,
    eccentricity: 0,
    inclinationDeg: 0,
    longitudeAscendingNodeDeg: 0,
    argumentPerihelionDeg: 0,
    meanAnomalyDeg: 0,
    ...overrides,
  };
}

test('Orbite circulaire à i=0, M=0 → position (1, 0, 0)', () => {
  // Arrange
  const elements = makeElements();

  // Act
  const p = orbitalElementsToHeliocentric(elements);

  // Assert
  assert.ok(Math.abs(p.x - 1) < EPS_POS);
  assert.ok(Math.abs(p.y) < EPS_POS);
  assert.ok(Math.abs(p.z) < EPS_POS);
});

test('Orbite circulaire à i=0, M=90° → position (0, 1, 0)', () => {
  const p = orbitalElementsToHeliocentric(makeElements({ meanAnomalyDeg: 90 }));
  assert.ok(Math.abs(p.x) < EPS_POS, `x=${p.x}`);
  assert.ok(Math.abs(p.y - 1) < EPS_POS, `y=${p.y}`);
  assert.ok(Math.abs(p.z) < EPS_POS, `z=${p.z}`);
});

test('Inclinaison i=90°, Ω=0, ω=0, M=90° → orbite dans le plan XZ → z > 0', () => {
  // Arrange : périhélie sur +X, l'orbite bascule de 90° autour de X.
  // Quand ν=90°, le corps quitte le plan écliptique vers +Z.
  const elements = makeElements({ inclinationDeg: 90, meanAnomalyDeg: 90 });

  // Act
  const p = orbitalElementsToHeliocentric(elements);

  // Assert
  assert.ok(Math.abs(p.x) < EPS_POS, `x=${p.x}`);
  assert.ok(Math.abs(p.y) < EPS_POS, `y=${p.y}`);
  assert.ok(Math.abs(p.z - 1) < EPS_POS, `z=${p.z}`);
});

test('Excentricité: distance au périhélie/aphélie correctes (Mercure J2000)', () => {
  // Arrange : Mercure d'après bodies.json
  const a = 0.38709893;
  const e = 0.20563069;

  // Périhélie : M = 0
  const peri = orbitalElementsToHeliocentric(makeElements({
    semiMajorAxisAu: a, eccentricity: e, meanAnomalyDeg: 0,
  }));
  // Aphélie : M = 180°
  const apo = orbitalElementsToHeliocentric(makeElements({
    semiMajorAxisAu: a, eccentricity: e, meanAnomalyDeg: 180,
  }));

  // Assert
  assert.ok(Math.abs(peri.r - a * (1 - e)) < EPS_DIST);
  assert.ok(Math.abs(apo.r - a * (1 + e)) < EPS_DIST);
});

test('Les orbites ne sont pas toutes coplanaires : inclinaisons réelles produisent z ≠ 0', () => {
  // Arrange : Mercure (i=7°) et Saturne (i=2.49°) à un instant non trivial.
  const cases = [
    { semiMajorAxisAu: 0.387, eccentricity: 0.206, inclinationDeg: 7.005,
      longitudeAscendingNodeDeg: 48.33, argumentPerihelionDeg: 29.12,
      meanAnomalyDeg: 174.8 },
    { semiMajorAxisAu: 9.537, eccentricity: 0.054, inclinationDeg: 2.486,
      longitudeAscendingNodeDeg: 113.72, argumentPerihelionDeg: -21.28,
      meanAnomalyDeg: 317.02 },
  ];

  // Act + Assert
  for (const c of cases) {
    const p = orbitalElementsToHeliocentric(c);
    assert.ok(Math.abs(p.z) > 1e-6, `z trop proche de 0 : ${p.z}`);
  }
});

test('Norme du vecteur position = r retourné', () => {
  const elements = {
    semiMajorAxisAu: 5.2, eccentricity: 0.048, inclinationDeg: 1.3,
    longitudeAscendingNodeDeg: 100.47, argumentPerihelionDeg: -85.8,
    meanAnomalyDeg: 19.35,
  };
  const p = orbitalElementsToHeliocentric(elements);
  const norm = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);
  assert.ok(Math.abs(norm - p.r) < 1e-12, `|p|=${norm}, r=${p.r}`);
});

test('3e loi de Kepler: T² ∝ a³ (Terre ≈ 365.25 j)', () => {
  // Arrange
  const aEarth = 1.0;

  // Act
  const T = orbitalPeriodDays(aEarth);

  // Assert : période sidérale ≈ 365.256 j
  assert.ok(Math.abs(T - 365.2568983) < 1e-3, `T=${T}`);
});

test('3e loi de Kepler: rapport (T_Jup/T_Terre)² = (a_Jup/a_Terre)³', () => {
  const tEarth = orbitalPeriodDays(1.0);
  const tJup = orbitalPeriodDays(5.2);
  const lhs = (tJup / tEarth) ** 2;
  const rhs = 5.2 ** 3;
  assert.ok(Math.abs(lhs - rhs) / rhs < 1e-12, `lhs=${lhs} rhs=${rhs}`);
});

test('propagateMeanAnomaly: avancer d\'une période complète ramène à M0', () => {
  // Arrange
  const elements = makeElements({ semiMajorAxisAu: 1, meanAnomalyDeg: 42 });
  const T = orbitalPeriodDays(1);

  // Act
  const advanced = propagateMeanAnomaly(elements, T);

  // Assert : M revient à 42° modulo 360
  const delta = Math.min(
    Math.abs(advanced.meanAnomalyDeg - 42),
    Math.abs(advanced.meanAnomalyDeg - 42 - 360),
    Math.abs(advanced.meanAnomalyDeg - 42 + 360),
  );
  assert.ok(delta < 1e-9, `M=${advanced.meanAnomalyDeg}`);
});

test('Moyen mouvement: a invalide → erreur', () => {
  assert.throws(() => meanMotionRadPerDay(0), RangeError);
  assert.throws(() => meanMotionRadPerDay(-1), RangeError);
});
