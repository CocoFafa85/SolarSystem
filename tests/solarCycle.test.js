import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  cyclePhaseYears,
  solarActivityIntensity,
  evaluateSolarFlare,
  DEFAULT_PERIOD_YEARS,
  DEFAULT_PEAK_OFFSET_YEARS,
} from '../src/physics/solarCycle.js';
import { HOURS_PER_YEAR } from '../src/physics/constants.js';

const EPS = 1e-9;

test('cyclePhaseYears: 0 h → phase 0', () => {
  assert.ok(Math.abs(cyclePhaseYears(0)) < EPS);
});

test('cyclePhaseYears: période complète → phase 0 (modulo)', () => {
  const oneCycle = DEFAULT_PERIOD_YEARS * HOURS_PER_YEAR;
  assert.ok(cyclePhaseYears(oneCycle) < EPS);
});

test('cyclePhaseYears: mi-cycle → ~5.5 ans', () => {
  const h = DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR;
  const phase = cyclePhaseYears(h);
  assert.ok(Math.abs(phase - DEFAULT_PEAK_OFFSET_YEARS) < EPS);
});

test('solarActivityIntensity: maximum au pic = 1', () => {
  const i = solarActivityIntensity(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR);
  assert.ok(Math.abs(i - 1) < EPS);
});

test('solarActivityIntensity: minimum solaire (phase=0) → ordre de grandeur 50× plus faible que le pic', () => {
  // Arrange : avec σ = window/2 = 2, l'antipode du pic (5.5 ans) tombe à 5.5σ ≈
  //   exp(-(5.5/2)²/2) ≈ 0.023 → on attend bien << 1, mais pas zéro.
  // Act
  const i = solarActivityIntensity(0);
  // Assert
  assert.ok(i < 0.05, `intensity=${i}`);
  assert.ok(i < 0.05 * 1, `intensity vs peak`);
});

test('solarActivityIntensity: symétrique autour du pic', () => {
  // Arrange
  const peakH = DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR;
  const dY = 1.5;
  // Act
  const before = solarActivityIntensity(peakH - dY * HOURS_PER_YEAR);
  const after = solarActivityIntensity(peakH + dY * HOURS_PER_YEAR);
  // Assert
  assert.ok(Math.abs(before - after) < 1e-12);
});

test('evaluateSolarFlare: deltaHours=0 → jamais actif (pas d\'aléa consommé)', () => {
  // Arrange
  let calls = 0;
  const rng = () => { calls++; return 0; };
  // Act
  const r = evaluateSolarFlare(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR, {
    rng, deltaHours: 0,
  });
  // Assert
  assert.equal(r.active, false);
  assert.equal(calls, 0);
});

test('evaluateSolarFlare: au pic, rng=0 → toujours déclenchée', () => {
  // Arrange : rng < 1 - exp(-λ) avec λ > 0 ⇒ true si rng = 0
  const r = evaluateSolarFlare(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR, {
    rng: () => 0, deltaHours: 24, baseProbabilityPerDay: 0.5,
  });
  // Assert
  assert.equal(r.active, true);
  assert.ok(r.intensity > 0.99);
});

test('evaluateSolarFlare: au pic, rng=0.999999 → jamais déclenchée', () => {
  const r = evaluateSolarFlare(DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR, {
    rng: () => 0.999999, deltaHours: 24, baseProbabilityPerDay: 0.5,
  });
  assert.equal(r.active, false);
});

test('evaluateSolarFlare: minimum solaire → taux d\'occurrence très faible', () => {
  // Arrange : intensité ~0.023 au minimum, deltaHours=1 → λ ≈ 0.023*0.5/24 ≈ 4.8e-4.
  // rng = 0.01 doit suffire à ne pas déclencher (probTrigger ≈ 4.8e-4 << 0.01).
  const r = evaluateSolarFlare(0, {
    rng: () => 0.01, deltaHours: 1, baseProbabilityPerDay: 0.5,
  });
  assert.equal(r.active, false);
});

test('evaluateSolarFlare: période invalide → erreur', () => {
  assert.throws(() => evaluateSolarFlare(0, { periodYears: 0 }), RangeError);
});

test('Statistique sur 1 cycle complet : pic concentre la majorité des éruptions', () => {
  // Arrange : RNG déterministe (LCG simple) pour reproductibilité
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const deltaHours = 24;
  const steps = Math.round((DEFAULT_PERIOD_YEARS * HOURS_PER_YEAR) / deltaHours);

  let countNearPeak = 0;
  let countFar = 0;

  // Act
  for (let i = 0; i < steps; i++) {
    const elapsedH = i * deltaHours;
    const r = evaluateSolarFlare(elapsedH, { rng, deltaHours, baseProbabilityPerDay: 0.5 });
    if (r.active) {
      const dy = Math.abs(r.phaseYears - DEFAULT_PEAK_OFFSET_YEARS);
      if (dy < 1) countNearPeak++; else countFar++;
    }
  }

  // Assert : concentration significative autour du pic.
  // Fenêtre "near" = 2 ans (sur 11) doit produire plus d'éruptions que les 9 ans
  // restants (densité moyenne par an clairement supérieure).
  const densityNear = countNearPeak / 2;
  const densityFar = countFar / 9;
  assert.ok(densityNear > densityFar * 2,
    `densités: near=${densityNear.toFixed(1)}/an far=${densityFar.toFixed(1)}/an`);
});
