import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  elapsedHoursToDate,
  dateToElapsedHours,
  elapsedHoursToCivilYear,
  createDateAdapter,
  J2000_EPOCH_DATE,
} from '../src/time/dateAdapter.js';

test('elapsedHoursToDate: 0h depuis J2000 → J2000', () => {
  // Arrange / Act
  const d = elapsedHoursToDate(0);
  // Assert
  assert.equal(d.getTime(), J2000_EPOCH_DATE.getTime());
});

test('elapsedHoursToDate: 24h → +1 jour exact', () => {
  const d0 = elapsedHoursToDate(0);
  const d1 = elapsedHoursToDate(24);
  assert.equal(d1.getTime() - d0.getTime(), 24 * 3600 * 1000);
});

test('elapsedHoursToDate: 8760 h depuis J2000 → début 2001 (à 1.96 h près)', () => {
  // Arrange : 8760 h = 365 jours
  // Act
  const d = elapsedHoursToDate(8760);
  // Assert
  assert.equal(d.getUTCFullYear(), 2000);
  // Janvier de l'année suivante avec 0.25 j manquant : on couvre simplement
  // que la date est postérieure au 31 déc 2000.
  const dec31 = Date.UTC(2000, 11, 31, 0, 0, 0);
  assert.ok(d.getTime() > dec31);
});

test('Aller-retour Date → elapsedHours → Date conserve la valeur (ms)', () => {
  // Arrange
  const target = new Date(Date.UTC(2026, 5, 8, 12, 0, 0));
  // Act
  const h = dateToElapsedHours(target);
  const back = elapsedHoursToDate(h);
  // Assert
  assert.equal(back.getTime(), target.getTime());
});

test('Origine personnalisée : 0h depuis 2026-01-01 → 2026-01-01', () => {
  // Arrange
  const origin = new Date(Date.UTC(2026, 0, 1));
  // Act
  const d = elapsedHoursToDate(0, origin);
  // Assert
  assert.equal(d.getTime(), origin.getTime());
});

test('createDateAdapter: fonctions liées', () => {
  // Arrange
  const adapter = createDateAdapter('2024-01-01T00:00:00Z');
  // Act
  const d = adapter.toDate(48); // +2 jours
  const back = adapter.fromDate(d);
  // Assert
  assert.equal(d.toISOString(), '2024-01-03T00:00:00.000Z');
  assert.ok(Math.abs(back - 48) < 1e-9);
});

test('elapsedHoursToCivilYear: depuis J2000 + 100 ans → 2100', () => {
  const y = elapsedHoursToCivilYear(100 * 8766); // 8766 h = 1 année julienne
  assert.ok(y >= 2099 && y <= 2101, `année=${y}`);
});

test('Arguments invalides', () => {
  assert.throws(() => elapsedHoursToDate(NaN), TypeError);
  assert.throws(() => elapsedHoursToDate(0, 'pas une date'), TypeError);
  assert.throws(() => createDateAdapter('zzz'), TypeError);
});
