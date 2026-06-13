import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  satelliteOrbitDisplayScale,
  computeVisualRadius,
} from '../src/scene/visualScale.js';

test('Cas Lune réelle : Terre 0.021 + Lune 0.0058 vs orbite 0.00257 → scale > 1', () => {
  // Arrange : valeurs réelles du LOT 4 ayant causé le bug "Lune étouffée"
  const parentVisual = 0.021;
  const childVisual = 0.0058;
  const orbit = 0.00257;
  // Act
  const s = satelliteOrbitDisplayScale(parentVisual, childVisual, orbit);
  // Assert
  assert.ok(s > 1, `scale=${s}`);
  // Après application, l'orbite affichée doit dégager le parent.
  const displayedOrbit = orbit * s;
  assert.ok(displayedOrbit > parentVisual + childVisual,
    `displayed=${displayedOrbit} parent+child=${parentVisual + childVisual}`);
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

test('Le scale garantit que (parent+child) ≤ marginRatio × (orbit × scale)', () => {
  // Arrange : config arbitraire problématique
  const parent = 0.5;
  const child = 0.2;
  const orbit = 0.1;
  const marginRatio = 0.4;
  // Act
  const s = satelliteOrbitDisplayScale(parent, child, orbit, marginRatio);
  // Assert
  assert.ok(parent + child <= marginRatio * (orbit * s) + 1e-12);
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
