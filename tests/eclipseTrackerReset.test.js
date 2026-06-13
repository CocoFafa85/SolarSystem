import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createEclipseTracker } from '../src/physics/eclipses.js';
import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import { HOURS_PER_YEAR } from '../src/physics/constants.js';

async function makeTracker() {
  const data = await loadBodiesFromFile();
  return createEclipseTracker({
    earthElements: data.bodies.earth.orbital,
    moonElements: data.bodies.moon.orbital,
    sunRadiusAu: data.bodies.sun.physical.radiusAu,
    earthRadiusAu: data.bodies.earth.physical.radiusAu,
    moonRadiusAu: data.bodies.moon.physical.radiusAu,
  });
}

test('resetState: les compteurs reviennent à 0', async () => {
  // Arrange
  const tracker = await makeTracker();
  tracker.advance(50 * HOURS_PER_YEAR);
  assert.ok(tracker.getCounters().solar > 0);
  // Act
  tracker.resetState();
  // Assert
  assert.deepEqual(tracker.getCounters(), { solar: 0, lunar: 0, superMoon: 0 });
});

test('resetState: les éléments orbitaux reviennent à J2000 (reproductibilité)', async () => {
  // Arrange : compter sur 30 ans une première fois
  const tracker = await makeTracker();
  tracker.advance(30 * HOURS_PER_YEAR);
  const first = { ...tracker.getCounters() };

  // Act : reset complet puis re-jouer les MÊMES 30 ans
  tracker.resetState();
  tracker.advance(30 * HOURS_PER_YEAR);
  const second = { ...tracker.getCounters() };

  // Assert : compteurs strictement identiques (donc M, Ω, ω, i, e, a restaurés)
  assert.deepEqual(first, second);
});

test('resetState: lastClassification revient à un état neutre', async () => {
  // Arrange
  const tracker = await makeTracker();
  tracker.advance(50 * HOURS_PER_YEAR);
  // Act
  tracker.resetState();
  // Assert
  const c = tracker.getLastClassification();
  assert.equal(c.solar, 'none');
  assert.equal(c.lunar, 'none');
  assert.equal(c.superMoon, false);
});
