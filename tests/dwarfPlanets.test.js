// LOT 6B — vérification des 5 planètes naines officiellement reconnues
// par l'IAU (résolution 5A du 24 août 2006) : Cérès, Pluton, Hauméa,
// Makémaké, Éris. Aucun corps candidat non-officiel.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import {
  orbitalElementsToHeliocentric,
  orbitalPeriodDays,
} from '../src/physics/orbital.js';

const IAU_DWARFS = ['ceres', 'pluto', 'haumea', 'makemake', 'eris'];

test('Les 5 planètes naines IAU sont présentes', async () => {
  // Arrange / Act
  const data = await loadBodiesFromFile();
  // Assert
  for (const id of IAU_DWARFS) {
    assert.ok(data.bodies[id], `${id} absent`);
    assert.equal(data.bodies[id].type, 'dwarf_planet', `${id} type`);
  }
});

test('Aucun corps candidat non-officiel (Sedna, Gonggong, Orcus, Quaoar) introduit', async () => {
  const data = await loadBodiesFromFile();
  for (const wrong of ['sedna', 'gonggong', 'orcus', 'quaoar', '90377_sedna']) {
    assert.ok(!data.bodies[wrong], `${wrong} ne doit pas être présent`);
  }
});

test('Cérès : éléments orbitaux dans des plages réalistes (ceinture principale)', async () => {
  const o = (await loadBodiesFromFile()).bodies.ceres.orbital;
  assert.ok(o.semiMajorAxisAu > 2.5 && o.semiMajorAxisAu < 3.0, `a=${o.semiMajorAxisAu}`);
  assert.ok(o.eccentricity > 0.05 && o.eccentricity < 0.10);
  assert.ok(o.inclinationDeg > 9 && o.inclinationDeg < 12);
});

test('Hauméa : éléments orbitaux trans-neptuniens (a ≈ 43 AU, i ≈ 28°)', async () => {
  const o = (await loadBodiesFromFile()).bodies.haumea.orbital;
  assert.ok(o.semiMajorAxisAu > 42 && o.semiMajorAxisAu < 44);
  assert.ok(o.inclinationDeg > 27 && o.inclinationDeg < 29);
});

test('Makémaké : éléments orbitaux trans-neptuniens (a ≈ 45 AU, e ≈ 0.16)', async () => {
  const o = (await loadBodiesFromFile()).bodies.makemake.orbital;
  assert.ok(o.semiMajorAxisAu > 44 && o.semiMajorAxisAu < 47);
  assert.ok(o.eccentricity > 0.10 && o.eccentricity < 0.20);
  assert.ok(o.inclinationDeg > 28 && o.inclinationDeg < 30);
});

test('Éris : orbite très excentrique et très inclinée (e ≈ 0.44, i ≈ 44°)', async () => {
  const o = (await loadBodiesFromFile()).bodies.eris.orbital;
  assert.ok(o.semiMajorAxisAu > 65 && o.semiMajorAxisAu < 70);
  assert.ok(o.eccentricity > 0.40 && o.eccentricity < 0.50);
  assert.ok(o.inclinationDeg > 42 && o.inclinationDeg < 46);
});

test('Périodes orbitales cohérentes (3e loi de Kepler)', async () => {
  // Arrange : références publiques (en années julliennes)
  const expected = {
    ceres:    4.60,     // ~4.6 ans
    pluto:   247.94,    // ~248 ans
    haumea:  284.12,    // ~284 ans
    makemake: 306.21,   // ~306 ans
    eris:    559.07,    // ~559 ans
  };
  const data = await loadBodiesFromFile();
  // Act + Assert
  for (const [id, yrs] of Object.entries(expected)) {
    const T_days = orbitalPeriodDays(data.bodies[id].orbital.semiMajorAxisAu);
    const T_years = T_days / 365.25;
    const tol = yrs * 0.02; // 2 %
    assert.ok(Math.abs(T_years - yrs) < tol,
      `${id}: T=${T_years.toFixed(2)} ans (attendu ${yrs} ±${tol.toFixed(1)})`);
  }
});

test('Position héliocentrique : chaque planète naine dans [périhélie, aphélie]', async () => {
  const data = await loadBodiesFromFile();
  for (const id of IAU_DWARFS) {
    const o = data.bodies[id].orbital;
    const p = orbitalElementsToHeliocentric(o);
    assert.ok(p.r >= o.semiMajorAxisAu * (1 - o.eccentricity) - 1e-9,
      `${id} r=${p.r} < périhélie`);
    assert.ok(p.r <= o.semiMajorAxisAu * (1 + o.eccentricity) + 1e-9,
      `${id} r=${p.r} > aphélie`);
  }
});

test('Inclinaisons élevées (>10°) → z significatif pour tous sauf Cérès', async () => {
  // Arrange : tous sauf Cérès doivent avoir une excursion |z| > 0.1 AU
  // (Hauméa, Makémaké, Pluton, Éris sont fortement inclinées).
  const data = await loadBodiesFromFile();
  const highIncl = ['pluto', 'haumea', 'makemake', 'eris'];
  // Act + Assert
  for (const id of highIncl) {
    const p = orbitalElementsToHeliocentric(data.bodies[id].orbital);
    assert.ok(Math.abs(p.z) > 0.1, `${id} z=${p.z}`);
  }
});

test('Cohérence physique : masse et rayon strictement positifs', async () => {
  const data = await loadBodiesFromFile();
  for (const id of IAU_DWARFS) {
    const ph = data.bodies[id].physical;
    assert.ok(ph.massKg > 0, `${id} mass`);
    assert.ok(ph.radiusAu > 0, `${id} radius`);
  }
});
