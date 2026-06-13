import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as bus from '../src/ui/core/eventBus.js';
import { ENGINE } from '../src/ui/core/channels.js';
import { createSolarFlareDetector } from '../src/physics/SolarFlareDetector.js';
import { DEFAULT_PEAK_OFFSET_YEARS } from '../src/physics/solarCycle.js';
import { HOURS_PER_YEAR } from '../src/physics/constants.js';

beforeEach(() => bus.clear());

/** Mock TimeService minimal — pilote elapsedHours et deltaHours à la main. */
function makeMockTime(initial = 0) {
  const snap = { elapsedHours: initial, deltaHours: 0, speed: 1, paused: false };
  return {
    clock: { getSnapshot: () => snap },
    advance(deltaHours) {
      snap.deltaHours = deltaHours;
      snap.elapsedHours += deltaHours;
    },
  };
}

test('Construction: timeService manquant → erreur', () => {
  assert.throws(() => createSolarFlareDetector({}), /timeService/);
});

test('tick(): deltaHours=0 → no-op, aucun event émis', () => {
  // Arrange
  const time = makeMockTime();
  const det = createSolarFlareDetector({ timeService: time, rng: () => 0 });
  let starts = 0;
  bus.on(ENGINE.SOLAR_FLARE_START, () => { starts++; });
  // Act
  det.tick();
  // Assert
  assert.equal(starts, 0);
});

test('Au pic, rng=0 → ENGINE.SOLAR_FLARE_START + ENGINE.EVENT_DETECTED', () => {
  // Arrange
  const time = makeMockTime(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR);
  const det = createSolarFlareDetector({
    timeService: time,
    rng: () => 0,
    baseProbabilityPerDay: 0.5,
  });
  let startPayload = null;
  let eventPayload = null;
  bus.on(ENGINE.SOLAR_FLARE_START, (p) => { startPayload = { ...p }; });
  bus.on(ENGINE.EVENT_DETECTED, (p) => { eventPayload = { ...p }; });

  // Act
  time.advance(24);
  det.tick();

  // Assert
  assert.ok(startPayload, 'SOLAR_FLARE_START non émis');
  assert.ok(startPayload.intensity > 0.99);
  assert.equal(eventPayload.type, 'solarFlare');
  assert.ok(eventPayload.at > 0);
});

test('Pendant une éruption en cours, aucun nouvel event start n\'est émis', () => {
  // Arrange : démarrage forcé
  const time = makeMockTime(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR);
  const det = createSolarFlareDetector({
    timeService: time,
    rng: () => 0,
    baseProbabilityPerDay: 0.5,
    flareDurationHours: 240,
  });
  let starts = 0;
  bus.on(ENGINE.SOLAR_FLARE_START, () => { starts++; });

  // Act : 1er tick déclenche, ticks suivants pendant la durée → pas de start
  time.advance(24); det.tick();
  for (let i = 0; i < 5; i++) { time.advance(24); det.tick(); }

  // Assert
  assert.equal(starts, 1);
  assert.equal(det.getCounters().solarFlare, 1);
});

test('À la fin de flareDurationHours, ENGINE.SOLAR_FLARE_END est émis', () => {
  // Arrange
  const time = makeMockTime(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR);
  const det = createSolarFlareDetector({
    timeService: time,
    rng: () => 0,
    baseProbabilityPerDay: 0.5,
    flareDurationHours: 100,
  });
  let ends = 0;
  bus.on(ENGINE.SOLAR_FLARE_END, () => { ends++; });

  // Act : déclenche puis dépasse la durée
  time.advance(24); det.tick();
  time.advance(200); det.tick();

  // Assert
  assert.equal(ends, 1);
  assert.equal(det.isActive(), false);
});

test('Zéro-alloc : tick() n\'allouera AUCUN payload neuf (refs identiques)', () => {
  // Arrange : on capture les refs émises et on vérifie l'identité
  const time = makeMockTime(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR);
  const det = createSolarFlareDetector({
    timeService: time,
    rng: () => 0,
    baseProbabilityPerDay: 0.5,
    flareDurationHours: 50,
  });
  const startRefs = [];
  const endRefs = [];
  bus.on(ENGINE.SOLAR_FLARE_START, (p) => startRefs.push(p));
  bus.on(ENGINE.SOLAR_FLARE_END, (p) => endRefs.push(p));

  // Act : 3 cycles déclenche / fin
  for (let cycle = 0; cycle < 3; cycle++) {
    time.advance(24); det.tick();          // start
    time.advance(100); det.tick();         // end
  }

  // Assert : toutes les emissions START partagent la même référence d'objet
  assert.ok(startRefs.length >= 2);
  assert.equal(startRefs[0], startRefs[1]);
  // END émis avec payload null → références identiques (null === null)
  assert.ok(endRefs.length >= 2);
});

test('reset() remet le détecteur dans un état neutre', () => {
  // Arrange
  const time = makeMockTime(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR);
  const det = createSolarFlareDetector({
    timeService: time, rng: () => 0, baseProbabilityPerDay: 0.5,
  });
  time.advance(24); det.tick();
  assert.equal(det.isActive(), true);
  assert.equal(det.getCounters().solarFlare, 1);

  // Act
  det.reset();

  // Assert
  assert.equal(det.isActive(), false);
  assert.equal(det.getCounters().solarFlare, 0);
});

test('Minimum solaire : rng=0.5 → pas de déclenchement', () => {
  const time = makeMockTime(0); // phase 0, intensité ~0.023
  const det = createSolarFlareDetector({
    timeService: time, rng: () => 0.5, baseProbabilityPerDay: 0.5,
  });
  let starts = 0;
  bus.on(ENGINE.SOLAR_FLARE_START, () => { starts++; });
  for (let i = 0; i < 10; i++) { time.advance(24); det.tick(); }
  assert.equal(starts, 0);
});
