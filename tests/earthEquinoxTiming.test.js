// Vérifie que la convention M0 dans bodies.json est conforme : l'équinoxe de
// mars 2000 (vrai date : 2000-03-20 ≈ J2000 + 79.3 j) doit être atteint par
// la Terre après ~79 jours simulés.
//
// Le bug LOT 5 venait de ce que `mean_anomaly_epoch_degrees` pour Earth et
// Mars contenait en réalité la LONGITUDE MOYENNE L, pas l'anomalie moyenne M.
// Correctif appliqué dans bodies.json : champs convertis via M = L − (Ω + ω).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import { orbitalElementsToHeliocentric } from '../src/physics/orbital.js';
import { propagateMeanAnomaly } from '../src/physics/orbital.js';
import { RAD_TO_DEG } from '../src/physics/constants.js';

function heliocentricLongitudeDeg(p) {
  let l = Math.atan2(p.y, p.x) * RAD_TO_DEG;
  if (l < 0) l += 360;
  return l;
}

test('Vernal equinox : Terre à L ≈ 180° après ≈ 79 jours depuis J2000.0', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const earth = data.bodies.earth.orbital;

  // Act : propager 79.3 jours
  const advanced = propagateMeanAnomaly(earth, 79.3);
  const p = orbitalElementsToHeliocentric(advanced);
  const L = heliocentricLongitudeDeg(p);

  // Assert : tolérance ±2° (réalité : ±1 jour ≈ ±1°)
  const delta = Math.min(Math.abs(L - 180), 360 - Math.abs(L - 180));
  assert.ok(delta < 2, `L=${L.toFixed(3)}° (attendu ≈ 180°, écart ${delta.toFixed(3)}°)`);
});

test('Summer solstice : Terre à L ≈ 270° après ≈ 172 jours depuis J2000.0', async () => {
  // Arrange : solstice d'été 2000 le 21 juin ≈ J2000 + 172 j
  const data = await loadBodiesFromFile();
  const earth = data.bodies.earth.orbital;
  // Act
  const advanced = propagateMeanAnomaly(earth, 172);
  const p = orbitalElementsToHeliocentric(advanced);
  const L = heliocentricLongitudeDeg(p);
  // Assert
  const delta = Math.min(Math.abs(L - 270), 360 - Math.abs(L - 270));
  assert.ok(delta < 2, `L=${L.toFixed(3)}° (attendu ≈ 270°, écart ${delta.toFixed(3)}°)`);
});

test('Autumnal equinox : Terre à L ≈ 0° après ≈ 266 jours depuis J2000.0', async () => {
  const data = await loadBodiesFromFile();
  const earth = data.bodies.earth.orbital;
  const advanced = propagateMeanAnomaly(earth, 266);
  const p = orbitalElementsToHeliocentric(advanced);
  const L = heliocentricLongitudeDeg(p);
  const delta = Math.min(Math.abs(L - 0), 360 - Math.abs(L - 0));
  assert.ok(delta < 2, `L=${L.toFixed(3)}° (écart ${delta.toFixed(3)}°)`);
});

test('Winter solstice : Terre à L ≈ 90° après ≈ 355 jours depuis J2000.0', async () => {
  const data = await loadBodiesFromFile();
  const earth = data.bodies.earth.orbital;
  const advanced = propagateMeanAnomaly(earth, 355);
  const p = orbitalElementsToHeliocentric(advanced);
  const L = heliocentricLongitudeDeg(p);
  const delta = Math.min(Math.abs(L - 90), 360 - Math.abs(L - 90));
  assert.ok(delta < 2, `L=${L.toFixed(3)}° (écart ${delta.toFixed(3)}°)`);
});

test('Mars J2000 : mean longitude L_mean = M0 + (Ω+ω) ≈ 355.45° (JPL)', async () => {
  // Arrange : après correction du bug L vs M, M0 ≈ 19.39° et Ω+ω = 336.06°.
  // La MEAN longitude (linéaire en t) doit redonner la valeur JPL.
  // Note : la TRUE longitude (atan2 sur la position) diffère par l'équation
  // du centre (~4° pour Mars, e=0.093) — c'est physique, pas un bug.
  const data = await loadBodiesFromFile();
  const mars = data.bodies.mars.orbital;
  // Act
  const Lmean = (mars.meanAnomalyDeg
    + mars.longitudeAscendingNodeDeg
    + mars.argumentPerihelionDeg + 360) % 360;
  // Assert
  const delta = Math.min(Math.abs(Lmean - 355.45), 360 - Math.abs(Lmean - 355.45));
  assert.ok(delta < 0.1, `L_mean=${Lmean.toFixed(4)}° (écart ${delta.toFixed(4)}°)`);
});

test('Mars J2000 : TRUE longitude (calculée) ≈ L_mean + équation du centre', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const mars = data.bodies.mars.orbital;
  // Act
  const p = orbitalElementsToHeliocentric(mars);
  const Ltrue = heliocentricLongitudeDeg(p);
  // Équation du centre 2e × sin(M) − (1/4) e³ sin(3M) (approx 2e ordre)
  const M = (mars.meanAnomalyDeg * Math.PI) / 180;
  const e = mars.eccentricity;
  const eqOfCenter = ((2 * e - 0.25 * e * e * e) * Math.sin(M)) * (180 / Math.PI);
  const Lexpected = ((mars.meanAnomalyDeg + eqOfCenter
    + mars.longitudeAscendingNodeDeg + mars.argumentPerihelionDeg) + 360) % 360;
  // Assert : tolérance 0.5° (termes ordre 3 négligés)
  const delta = Math.min(Math.abs(Ltrue - Lexpected), 360 - Math.abs(Ltrue - Lexpected));
  assert.ok(delta < 0.5,
    `L_true=${Ltrue.toFixed(3)}° vs L_attendu=${Lexpected.toFixed(3)}° (écart ${delta.toFixed(3)}°)`);
});
