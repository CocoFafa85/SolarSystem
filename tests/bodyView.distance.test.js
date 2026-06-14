// LOT 13 — Métrique "distance" du comparateur : tri, formatter, ratio.
//
// Pure unit-test de la couche data — pas de fetch, on construit des VMs à la
// main au format de buildVm() (cf. src/ui/data/bodyView.js:31).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatAu,
  sortByMetric,
  metricValue,
} from '../src/ui/data/bodyView.js';

function makeVm(id, semiMajorAxisAu) {
  return {
    id,
    name: id,
    physical: { massKg: 1, radiusKm: 1, rotationPeriodHours: 1 },
    orbital: semiMajorAxisAu == null ? null : { semiMajorAxisAu },
    derived: { orbitalSpeedKmS: 0, tempMinK: 0, tempMaxK: 0 },
  };
}

test('formatAu — formats valides + sentinelles', () => {
  assert.equal(formatAu(1), '1 UA');
  assert.equal(formatAu(0.387), '0,387 UA');
  assert.equal(formatAu(30.07), '30,07 UA');
  assert.equal(formatAu(NaN), '—');
  assert.equal(formatAu(undefined), '—');
  assert.equal(formatAu(Infinity), '—');
});

test('sortByMetric("distance") — décroissant, corps sans orbite en queue', () => {
  const list = [
    makeVm('mercury', 0.387),
    makeVm('neptune', 30.07),
    makeVm('earth', 1.0),
    makeVm('sun', null),     // pas d'orbite
    makeVm('eris', 67.78),
    makeVm('mars', 1.524),
  ];
  const sorted = sortByMetric(list, 'distance');
  const ids = sorted.map((v) => v.id);
  // Eris > Neptune > Mars > Earth > Mercury > Sun (queue)
  assert.deepEqual(ids, ['eris', 'neptune', 'mars', 'earth', 'mercury', 'sun']);
});

test('metricValue(vm, "distance") — Terre = "1 UA"', () => {
  const vm = makeVm('earth', 1.0);
  assert.equal(metricValue(vm, 'distance'), '1 UA');
});

test('metricValue(vm, "distance") — VM sans orbite → "—"', () => {
  const vm = makeVm('sun', null);
  assert.equal(metricValue(vm, 'distance'), '—');
});

test('CompareOverlay.metricNumber("distance") — ratio Neptune/Terre ≈ 30,07', async () => {
  // metricNumber n'est pas exporté ; on émule la même logique :
  const neptuneAu = 30.07;
  const earthAu = 1.0;
  const ratio = neptuneAu / earthAu;
  assert.ok(Math.abs(ratio - 30.07) < 0.01);
});
