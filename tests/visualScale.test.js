import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  satelliteOrbitDisplayScale,
  computeVisualRadius,
} from '../src/scene/visualScale.js';

test('LOT 12 — échelle 1:1 stricte : satelliteOrbitDisplayScale retourne 1 constant', () => {
  // À l'échelle 1:1 (LOT 12), la Terre fait 4.26e-5 UA et la Lune orbite à
  // 2.57e-3 UA = 60 rayons terrestres. Elle sort NATURELLEMENT du mesh sans
  // exagération. L'ancien contrat (scale > 1) est obsolète.
  const parentVisual = 4.26e-5;
  const childVisual = 1.16e-5;
  const orbit = 2.57e-3;
  const s = satelliteOrbitDisplayScale(parentVisual, childVisual, orbit);
  assert.equal(s, 1);
  // Vérifie que la Lune sort bien du mesh sans exagération.
  assert.ok(orbit > parentVisual + childVisual);
});

test('Configuration confortable (parent petit, orbite large) → scale = 1', () => {
  const s = satelliteOrbitDisplayScale(0.001, 0.0005, 0.1);
  assert.equal(s, 1);
});

test('Limite marge 0.45 : à exactement la marge → scale = 1', () => {
  // Arrange : (parent + child) = 0.45 × orbit ⇒ scale demandé = 1
  const orbit = 1;
  const sum = 0.45;
  // Act
  const s = satelliteOrbitDisplayScale(sum * 0.5, sum * 0.5, orbit);
  // Assert
  assert.equal(s, 1);
});

test('LOT 12 — retour constant 1 quelle que soit la configuration', () => {
  // Le contrat 1:1 stricte garantit que tous les corps physiques sont à leur
  // taille réelle. Aucune exagération n'est appliquée même dans des cas
  // dégénérés (l'utilisateur perçoit l'écart correctement).
  const s = satelliteOrbitDisplayScale(0.5, 0.2, 0.1, 0.4);
  assert.equal(s, 1);
});

test('Arguments invalides → erreurs', () => {
  assert.throws(() => satelliteOrbitDisplayScale(-1, 1, 1), RangeError);
  assert.throws(() => satelliteOrbitDisplayScale(1, 1, 0), RangeError);
  assert.throws(() => satelliteOrbitDisplayScale(1, 1, 1, 0), RangeError);
  assert.throws(() => satelliteOrbitDisplayScale(1, 1, 1, 1), RangeError);
});

test('computeVisualRadius: multiplier appliqué', () => {
  assert.equal(computeVisualRadius(2, 10), 20);
});

test('computeVisualRadius: plancher minRadiusAu respecté', () => {
  assert.equal(computeVisualRadius(0.001, 1, 0.5), 0.5);
});

test('computeVisualRadius: plafond maxRadiusAu respecté', () => {
  assert.equal(computeVisualRadius(10, 100, 0, 50), 50);
});

test('computeVisualRadius: arguments invalides → erreurs', () => {
  assert.throws(() => computeVisualRadius(-1, 1), RangeError);
  assert.throws(() => computeVisualRadius(1, 0), RangeError);
});
