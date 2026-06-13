import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateSolarFlare,
  evaluateSolarFlareInto,
  DEFAULT_PEAK_OFFSET_YEARS,
} from '../src/physics/solarCycle.js';
import { HOURS_PER_YEAR } from '../src/physics/constants.js';

test('evaluateSolarFlareInto: sans buffer → TypeError', () => {
  assert.throws(() => evaluateSolarFlareInto(0, {}, undefined), TypeError);
});

test('evaluateSolarFlareInto: écrit dans le buffer et retourne la même référence', () => {
  // Arrange
  const out = { active: true, intensity: 0, phaseYears: 0 };
  // Act
  const r = evaluateSolarFlareInto(0, { deltaHours: 0 }, out);
  // Assert
  assert.equal(r, out);
  // À phase=0 et deltaHours=0, active doit être false
  assert.equal(out.active, false);
});

test('Zéro allocation : 10 000 ticks réutilisent le même buffer', () => {
  // Arrange
  const out = { active: false, intensity: 0, phaseYears: 0 };
  // Act
  for (let i = 0; i < 10000; i++) {
    const r = evaluateSolarFlareInto(i * 24, { deltaHours: 24, rng: () => 0.5 }, out);
    // Assert : même référence à chaque appel
    assert.equal(r, out);
  }
});

test('evaluateSolarFlareInto produit le MÊME résultat fonctionnel qu\'evaluateSolarFlare', () => {
  // Arrange : RNG déterministe partagé entre les 2 appels
  let seed = 42;
  const det = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const elapsedH = 3 * HOURS_PER_YEAR;
  const opts1 = { deltaHours: 24, rng: det, baseProbabilityPerDay: 0.5 };

  // Act : utiliser deux RNG identiques pour comparer
  seed = 42;
  const r1 = evaluateSolarFlare(elapsedH, opts1);
  seed = 42;
  const out = { active: false, intensity: 0, phaseYears: 0 };
  evaluateSolarFlareInto(elapsedH, opts1, out);

  // Assert
  assert.equal(out.active, r1.active);
  assert.ok(Math.abs(out.intensity - r1.intensity) < 1e-12);
  assert.ok(Math.abs(out.phaseYears - r1.phaseYears) < 1e-12);
});

test('Au pic et rng=0 → out.active=true, intensity≈1', () => {
  const out = { active: false, intensity: 0, phaseYears: 0 };
  evaluateSolarFlareInto(
    DEFAULT_PEAK_OFFSET_YEARS * HOURS_PER_YEAR,
    { rng: () => 0, deltaHours: 24, baseProbabilityPerDay: 0.5 },
    out,
  );
  assert.equal(out.active, true);
  assert.ok(out.intensity > 0.99);
});
