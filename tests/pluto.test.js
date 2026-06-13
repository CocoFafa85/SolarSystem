import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import { orbitalElementsToHeliocentric, orbitalPeriodDays } from '../src/physics/orbital.js';

test('Pluton: présent dans bodies.json comme dwarf_planet', async () => {
  const data = await loadBodiesFromFile();
  const p = data.bodies.pluto;
  assert.ok(p, 'pluton absent');
  assert.equal(p.type, 'dwarf_planet');
  assert.equal(p.name, 'Pluton');
});

test('Pluton: éléments orbitaux dans des plages physiquement réalistes', async () => {
  const data = await loadBodiesFromFile();
  const o = data.bodies.pluto.orbital;
  assert.ok(o.semiMajorAxisAu > 39 && o.semiMajorAxisAu < 40, `a=${o.semiMajorAxisAu}`);
  assert.ok(o.eccentricity > 0.2 && o.eccentricity < 0.3);
  assert.ok(o.inclinationDeg > 16 && o.inclinationDeg < 18);
});

test('Pluton: position héliocentrique → distance dans [périhélie, aphélie]', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const o = data.bodies.pluto.orbital;
  // Act
  const p = orbitalElementsToHeliocentric(o);
  // Assert
  assert.ok(p.r >= o.semiMajorAxisAu * (1 - o.eccentricity) - 1e-9);
  assert.ok(p.r <= o.semiMajorAxisAu * (1 + o.eccentricity) + 1e-9);
});

test('Pluton: période orbitale ≈ 248 ans terrestres', async () => {
  // Arrange
  const data = await loadBodiesFromFile();
  const o = data.bodies.pluto.orbital;
  // Act
  const T_days = orbitalPeriodDays(o.semiMajorAxisAu);
  const T_years = T_days / 365.25;
  // Assert : valeur réelle ≈ 247.94 ans (Kepler pur Soleil-Pluton)
  assert.ok(Math.abs(T_years - 247.94) < 1, `T=${T_years} ans`);
});

test('Pluton: rotation rétrograde (rotation_period_hours < 0)', async () => {
  const data = await loadBodiesFromFile();
  assert.ok(data.bodies.pluto.physical.rotationPeriodHours < 0);
});

test('Pluton: obliquité forte (> 100°) cohérente avec sa rotation rétrograde', async () => {
  const data = await loadBodiesFromFile();
  assert.ok(data.bodies.pluto.physical.obliquityDeg > 100);
});
