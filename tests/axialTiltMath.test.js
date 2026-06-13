import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  obliquityToTiltRotationX,
  rotationOmegaPerHour,
} from '../src/scene/axialTiltMath.js';

const EPS = 1e-12;

/** Applique rotation X(θ) à un vecteur Y unitaire (axe de spin par défaut). */
function applyRotXtoY(theta) {
  return { x: 0, y: Math.cos(theta), z: Math.sin(theta) };
}

test('Obliquité 0° → axe de spin = +Z world (pôle écliptique)', () => {
  // Arrange / Act
  const theta = obliquityToTiltRotationX(0);
  const axis = applyRotXtoY(theta);
  // Assert
  assert.ok(Math.abs(axis.x) < EPS);
  assert.ok(Math.abs(axis.y) < EPS);
  assert.ok(Math.abs(axis.z - 1) < EPS, `axis.z=${axis.z}`);
});

test('Obliquité 90° (Uranus couché) → axe dans le plan écliptique', () => {
  const theta = obliquityToTiltRotationX(90);
  const axis = applyRotXtoY(theta);
  // L'axe doit avoir z ≈ 0 (dans le plan XY) — composante y = 1.
  assert.ok(Math.abs(axis.z) < EPS, `axis.z=${axis.z}`);
  assert.ok(Math.abs(axis.y - 1) < EPS, `axis.y=${axis.y}`);
});

test('Obliquité 180° (Vénus rétrograde) → axe = -Z world', () => {
  const theta = obliquityToTiltRotationX(180);
  const axis = applyRotXtoY(theta);
  assert.ok(Math.abs(axis.z + 1) < EPS, `axis.z=${axis.z}`);
});

test('Obliquité 23.44° (Terre) → angle réel entre axe et +Z = 23.44°', () => {
  // Arrange
  const eps = 23.44;
  const theta = obliquityToTiltRotationX(eps);
  // Act
  const axis = applyRotXtoY(theta);
  const cosAngleFromZ = axis.z; // axis est unitaire
  const angleDeg = (Math.acos(cosAngleFromZ) * 180) / Math.PI;
  // Assert
  assert.ok(Math.abs(angleDeg - eps) < 1e-9, `angle=${angleDeg}`);
});

test('Argument invalide → TypeError', () => {
  assert.throws(() => obliquityToTiltRotationX(NaN), TypeError);
  assert.throws(() => obliquityToTiltRotationX('45'), TypeError);
});

test('rotationOmegaPerHour: période 24h → ω = 2π/24', () => {
  const w = rotationOmegaPerHour(24);
  assert.ok(Math.abs(w - (2 * Math.PI) / 24) < 1e-12);
});

test('rotationOmegaPerHour: période négative (rétrograde) → ω négatif', () => {
  const w = rotationOmegaPerHour(-5832.6); // Vénus
  assert.ok(w < 0);
});

test('rotationOmegaPerHour: 0 ou NaN → 0 (pas de rotation)', () => {
  assert.equal(rotationOmegaPerHour(0), 0);
  assert.equal(rotationOmegaPerHour(NaN), 0);
});
