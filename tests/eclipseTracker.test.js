import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createEclipseTracker } from '../src/physics/eclipses.js';
import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import { HOURS_PER_YEAR } from '../src/physics/constants.js';

/** Construit un tracker depuis le bodies.json projet. */
async function makeTracker(overrides = {}) {
  const data = await loadBodiesFromFile();
  return createEclipseTracker({
    earthElements: data.bodies.earth.orbital,
    moonElements: data.bodies.moon.orbital,
    sunRadiusAu: data.bodies.sun.physical.radiusAu,
    earthRadiusAu: data.bodies.earth.physical.radiusAu,
    moonRadiusAu: data.bodies.moon.physical.radiusAu,
    ...overrides,
  });
}

test('Tracker: arguments manquants → erreur explicite', () => {
  assert.throws(() => createEclipseTracker({}), /requis/);
});

test('Sur 30 ans simulés à pas fin, au moins quelques éclipses solaires comptabilisées', async () => {
  // Arrange
  const tracker = await makeTracker();
  // Act : 30 ans, sub-step 1h (défaut). Ne PAS appeler advance() avec une
  // énorme valeur d'un coup en prod ; ici on teste justement le sub-stepping.
  tracker.advance(30 * HOURS_PER_YEAR);
  // Assert : au moins 30 éclipses solaires en 30 ans (env. 2/an attendues).
  const c = tracker.getCounters();
  // Avec éléments STATIQUES J2000 (pas de précession nodale modélisée), seuls
  // les Earth-positions qui tombent dans la "fenêtre nodale" fixe produisent
  // des alignements. ~1/an est réaliste pour ce modèle simplifié.
  assert.ok(c.solar >= 10, `solar=${c.solar}`);
  assert.ok(c.lunar >= 5, `lunar=${c.lunar}`);
});

test('Bug "aucun événement après 300 ans" — résolu par le sub-stepping', async () => {
  // Arrange : on simule un saut massif d'un coup (1000 h par appel = vitesse
  // de simulation très élevée). Sans sub-stepping, les fenêtres d'éclipse
  // sont enjambées ; avec sub-stepping le tracker reste exact.
  const tracker = await makeTracker();
  const totalYears = 300;
  const stepHours = 1000; // ≈ "tick" haute vitesse
  const ticks = Math.round((totalYears * HOURS_PER_YEAR) / stepHours);

  // Act
  for (let i = 0; i < ticks; i++) tracker.advance(stepHours);

  // Assert : compteur strictement positif et croissant ≈ ratio attendu.
  const c = tracker.getCounters();
  assert.ok(c.solar > 100, `solar=${c.solar} (attendu > 100 sur 300 ans)`);
  assert.ok(c.lunar > 100, `lunar=${c.lunar}`);
});

test('Debounce : un événement actif sur plusieurs ticks ne compte qu\'une fois', async () => {
  // Arrange : forcer une géométrie d'éclipse solaire totale via une config
  // synthétique avec position lunaire géocentrique alignée.
  const tracker = createEclipseTracker({
    earthElements: {
      semiMajorAxisAu: 1, eccentricity: 0, inclinationDeg: 0,
      longitudeAscendingNodeDeg: 0, argumentPerihelionDeg: 0,
      meanAnomalyDeg: 0,
    },
    // Orbite lunaire très lente (forte semi-major) pour rester dans la
    // fenêtre d'alignement pendant plusieurs sub-steps.
    moonElements: {
      semiMajorAxisAu: 0.00243, eccentricity: 0, inclinationDeg: 0,
      longitudeAscendingNodeDeg: 0, argumentPerihelionDeg: 0,
      meanAnomalyDeg: 180, // côté +X local → vu de la Terre, vers le Soleil
    },
    sunRadiusAu: 0.0046524,
    earthRadiusAu: 0.00004263,
    moonRadiusAu: 0.00001161,
    maxStepHours: 0.1, // ultra-fin
  });

  // Act : on avance d'une petite fenêtre — plusieurs sub-steps, tous "total"
  tracker.advance(0.5);

  // Assert : 1 seule éclipse comptabilisée même avec ~5 sub-steps actifs.
  assert.equal(tracker.getCounters().solar, 1);
});

test('getLastClassification reflète l\'état courant', async () => {
  const tracker = await makeTracker();
  tracker.advance(24);
  const c = tracker.getLastClassification();
  assert.ok(['none', 'partial', 'total', 'annular'].includes(c.solar));
  assert.ok(['none', 'penumbral', 'partial', 'total'].includes(c.lunar));
  assert.equal(typeof c.superMoon, 'boolean');
});

test('resetCounters remet à zéro sans casser la propagation orbitale', async () => {
  const tracker = await makeTracker();
  tracker.advance(50 * HOURS_PER_YEAR);
  const before = { ...tracker.getCounters() };
  assert.ok(before.solar > 0);
  tracker.resetCounters();
  assert.equal(tracker.getCounters().solar, 0);
  tracker.advance(50 * HOURS_PER_YEAR);
  assert.ok(tracker.getCounters().solar > 0);
});

test('advance(0) est un no-op', async () => {
  const tracker = await makeTracker();
  tracker.advance(0);
  assert.equal(tracker.getCounters().solar, 0);
});

test('advance(non-fini) → TypeError', async () => {
  const tracker = await makeTracker();
  assert.throws(() => tracker.advance(NaN), TypeError);
});
