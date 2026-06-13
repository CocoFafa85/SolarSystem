import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadBodiesFromFile, parseBodies, normalizeBody } from '../src/physics/bodyLoader.js';
import { orbitalElementsToHeliocentric } from '../src/physics/orbital.js';

test('bodies.json se charge et contient au moins les 8 planètes + Soleil + Lune', () => {
  // Act
  return loadBodiesFromFile().then((data) => {
    // Assert
    const expected = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars',
      'jupiter', 'saturn', 'uranus', 'neptune'];
    for (const id of expected) {
      assert.ok(data.bodies[id], `corps absent: ${id}`);
    }
    assert.equal(data.epoch, 'J2000.0');
    assert.equal(data.kmPerAu, 149597870.7);
  });
});

test('Soleil : orbital === null (héliocentrique)', async () => {
  const data = await loadBodiesFromFile();
  assert.equal(data.bodies.sun.orbital, null);
});

test('Terre J2000 : distance héliocentrique ≈ 1 UA (±0.02 UA)', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const earth = data.bodies.earth;

  // Act
  const p = orbitalElementsToHeliocentric(earth.orbital);

  // Assert : à J2000 la Terre est proche du périhélie début janvier,
  // donc r doit être dans [a(1-e), a(1+e)] ≈ [0.983, 1.017]
  const a = earth.orbital.semiMajorAxisAu;
  const e = earth.orbital.eccentricity;
  assert.ok(p.r >= a * (1 - e) - 1e-9, `r=${p.r} < périhélie`);
  assert.ok(p.r <= a * (1 + e) + 1e-9, `r=${p.r} > aphélie`);
});

test('Toutes les planètes ont une inclinaison reportée dans le z final', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

  // Act + Assert : aucune planète ne doit être strictement dans le plan z=0
  for (const id of planets) {
    const p = orbitalElementsToHeliocentric(data.bodies[id].orbital);
    assert.ok(Math.abs(p.z) > 1e-6, `${id} z=${p.z} (orbite plate)`);
  }
});

test('parseBodies rejette une structure invalide', () => {
  assert.throws(() => parseBodies(null), /structure racine/);
  assert.throws(() => parseBodies({}), /structure racine/);
});

test('normalizeBody rejette une excentricité hyperbolique', () => {
  assert.throws(() => normalizeBody('x', {
    physical: { mass: 1, radius_au: 1, rotation_period_hours: 1, obliquity_degrees: 0 },
    orbital: {
      semi_major_axis_au: 1, eccentricity: 1.2, inclination_degrees: 0,
      longitude_ascending_node_degrees: 0, argument_perihelion_degrees: 0,
      mean_anomaly_epoch_degrees: 0,
    },
  }), RangeError);
});
