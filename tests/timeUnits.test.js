import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  hoursToDays, hoursToYears,
  daysToHours, yearsToHours,
  secondsToHours, hoursToSeconds,
  decomposeHours,
} from '../src/time/timeUnits.js';

const EPS = 1e-12;

test('hoursToDays: 24 h = 1 j', () => {
  assert.ok(Math.abs(hoursToDays(24) - 1) < EPS);
});

test('hoursToYears: 8760 h = 1 a (convention bodies.json)', () => {
  assert.ok(Math.abs(hoursToYears(8760) - 1) < EPS);
});

test('Aller-retour: daysToHours ∘ hoursToDays = identité', () => {
  // Arrange
  const h = 1234.56;
  // Act
  const round = daysToHours(hoursToDays(h));
  // Assert
  assert.ok(Math.abs(round - h) < 1e-9);
});

test('Aller-retour: yearsToHours ∘ hoursToYears = identité', () => {
  const h = 99999.999;
  const round = yearsToHours(hoursToYears(h));
  assert.ok(Math.abs(round - h) < 1e-9);
});

test('secondsToHours: 3600 s = 1 h', () => {
  assert.ok(Math.abs(secondsToHours(3600) - 1) < EPS);
});

test('decomposeHours: 0 → 0a 0j 0h', () => {
  // Arrange
  const out = { years: -1, days: -1, hours: -1 };
  // Act
  decomposeHours(0, out);
  // Assert
  assert.deepEqual(out, { years: 0, days: 0, hours: 0 });
});

test('decomposeHours: 25.5 h → 0a 1j 1.5h', () => {
  const out = { years: 0, days: 0, hours: 0 };
  decomposeHours(25.5, out);
  assert.equal(out.years, 0);
  assert.equal(out.days, 1);
  assert.ok(Math.abs(out.hours - 1.5) < 1e-9);
});

test('decomposeHours: 1 année + 2 jours + 3 h → 1a 2j 3h', () => {
  // Arrange
  const h = 8760 + 2 * 24 + 3;
  const out = { years: 0, days: 0, hours: 0 };
  // Act
  decomposeHours(h, out);
  // Assert
  assert.equal(out.years, 1);
  assert.equal(out.days, 2);
  assert.ok(Math.abs(out.hours - 3) < 1e-9);
});

test('decomposeHours: valeur négative (rewind) → tous signes inversés', () => {
  const out = { years: 0, days: 0, hours: 0 };
  decomposeHours(-(8760 + 24 + 5), out);
  assert.equal(out.years, -1);
  assert.equal(out.days, -1);
  assert.ok(Math.abs(out.hours + 5) < 1e-9);
});

test('decomposeHours: zéro-alloc — réutilise le même buffer', () => {
  // Arrange
  const out = { years: 0, days: 0, hours: 0 };
  // Act
  const r1 = decomposeHours(100, out);
  const r2 = decomposeHours(200, out);
  // Assert : même référence à chaque appel
  assert.equal(r1, out);
  assert.equal(r2, out);
});

test('decomposeHours: sans buffer → TypeError', () => {
  assert.throws(() => decomposeHours(1, undefined), TypeError);
});
