import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeEarthSeasonMarkers } from '../src/physics/earthMarkers.js';
import { positionAtTrueAnomaly } from '../src/physics/orbital.js';
import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import { RAD_TO_DEG, wrapTwoPi } from '../src/physics/constants.js';

/** Longitude héliocentrique écliptique d'une position (deg, dans [0, 360)). */
function heliocentricLongitudeDeg(p) {
  let l = Math.atan2(p.y, p.x) * RAD_TO_DEG;
  if (l < 0) l += 360;
  return l;
}

test('Les 4 repères ont bien les longitudes héliocentriques cibles (0, 90, 180, 270°)', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const earth = data.bodies.earth.orbital;

  // Act
  const m = computeEarthSeasonMarkers(earth);

  // Assert
  const targets = {
    autumnalEquinox: 0,
    winterSolstice: 90,
    vernalEquinox: 180,
    summerSolstice: 270,
  };
  for (const [name, expected] of Object.entries(targets)) {
    const actual = heliocentricLongitudeDeg(m[name]);
    const delta = Math.abs(actual - expected);
    const wrapped = Math.min(delta, 360 - delta);
    assert.ok(wrapped < 1e-6, `${name}: ${actual}° ≠ ${expected}°`);
  }
});

test('Les 4 repères sont à des distances cohérentes avec une orbite elliptique', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const earth = data.bodies.earth.orbital;
  const a = earth.semiMajorAxisAu;
  const e = earth.eccentricity;

  // Act
  const m = computeEarthSeasonMarkers(earth);

  // Assert : tous compris entre périhélie et aphélie
  for (const name of Object.keys(m)) {
    assert.ok(m[name].r >= a * (1 - e) - 1e-9, `${name} r=${m[name].r} < périhélie`);
    assert.ok(m[name].r <= a * (1 + e) + 1e-9, `${name} r=${m[name].r} > aphélie`);
  }
});

test('Les équinoxes sont diamétralement opposés sur l\'orbite', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const earth = data.bodies.earth.orbital;
  const m = computeEarthSeasonMarkers(earth);

  // Act : différence angulaire vernal vs automnal
  const lVernal = heliocentricLongitudeDeg(m.vernalEquinox);
  const lAuto = heliocentricLongitudeDeg(m.autumnalEquinox);
  const delta = Math.abs(lVernal - lAuto);
  const wrapped = Math.min(delta, 360 - delta);

  // Assert
  assert.ok(Math.abs(wrapped - 180) < 1e-6, `Δ=${wrapped}°`);
});

test('positionAtTrueAnomaly: ν=0 → périhélie, ν=π → aphélie', () => {
  // Arrange
  const elements = {
    semiMajorAxisAu: 2,
    eccentricity: 0.3,
    inclinationDeg: 0,
    longitudeAscendingNodeDeg: 0,
    argumentPerihelionDeg: 0,
    meanAnomalyDeg: 0,
  };

  // Act + Assert
  const peri = positionAtTrueAnomaly(elements, 0);
  assert.ok(Math.abs(peri.r - 2 * (1 - 0.3)) < 1e-12);
  const apo = positionAtTrueAnomaly(elements, Math.PI);
  assert.ok(Math.abs(apo.r - 2 * (1 + 0.3)) < 1e-12);
});

test('computeEarthSeasonMarkers: argument invalide → TypeError', () => {
  assert.throws(() => computeEarthSeasonMarkers(null), TypeError);
});
