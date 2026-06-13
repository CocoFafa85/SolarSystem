import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SimulationClock } from '../src/time/SimulationClock.js';

test('Construction par défaut : speed=1, non en pause, elapsed=0', () => {
  // Act
  const c = new SimulationClock();
  // Assert
  assert.equal(c.getSpeed(), 1);
  assert.equal(c.isPaused(), false);
  assert.equal(c.getElapsedHours(), 0);
});

test('Premier tick après start: pas d\'avance, just initialisation', () => {
  // Arrange
  const c = new SimulationClock();
  c.start(0);
  // Act
  const d = c.tick(0);
  // Assert
  assert.equal(d, 0);
  assert.equal(c.getElapsedHours(), 0);
});

test('tick: à speed=1, 1 s réelle → 1 h simulée', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 1 });
  c.start(0);
  // Act
  c.tick(1);
  // Assert
  assert.ok(Math.abs(c.getElapsedHours() - 1) < 1e-12);
});

test('tick: à speed=24, 1 s réelle → 1 jour simulé (24 h)', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 24 });
  c.start(10);
  // Act
  c.tick(11);
  // Assert
  assert.ok(Math.abs(c.getElapsedHours() - 24) < 1e-12);
});

test('tick: pause gèle l\'intégration mais pas le compteur', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 10 });
  c.start(0);
  c.tick(1);             // +10 h
  // Act
  c.setPaused(true);
  c.tick(2);             // pas d'avance pendant 1 s
  c.tick(5);             // 3 s en pause
  c.setPaused(false);
  c.tick(6);             // 1 s d'avance → +10 h
  // Assert
  assert.ok(Math.abs(c.getElapsedHours() - 20) < 1e-9);
});

test('tick: vitesse négative permet le rewind', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: -5 });
  c.start(0);
  // Act
  c.tick(2);
  // Assert
  assert.ok(Math.abs(c.getElapsedHours() + 10) < 1e-12);
});

test('setSpeed: clamp dans [minSpeed, maxSpeed]', () => {
  // Arrange
  const c = new SimulationClock({ minSpeed: -100, maxSpeed: 100 });
  // Act
  c.setSpeed(999);
  // Assert
  assert.equal(c.getSpeed(), 100);
  c.setSpeed(-999);
  assert.equal(c.getSpeed(), -100);
});

test('setSpeed: NaN/Infinity rejetés', () => {
  const c = new SimulationClock();
  assert.throws(() => c.setSpeed(NaN), TypeError);
  assert.throws(() => c.setSpeed(Infinity), TypeError);
});

test('stepSpeed: multiplicatif (×2 puis ×½ = identité)', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 3 });
  // Act
  c.stepSpeed(2);
  c.stepSpeed(0.5);
  // Assert
  assert.ok(Math.abs(c.getSpeed() - 3) < 1e-12);
});

test('stepSpeed depuis speed=0 → reprise à ±1 selon le signe du facteur', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 0 });
  // Act
  c.stepSpeed(2);
  // Assert
  assert.equal(c.getSpeed(), 2);

  const c2 = new SimulationClock({ initialSpeed: 0 });
  c2.stepSpeed(-2);
  assert.equal(c2.getSpeed(), -2);
});

test('togglePause inverse l\'état', () => {
  // Arrange
  const c = new SimulationClock();
  // Act + Assert
  assert.equal(c.isPaused(), false);
  c.togglePause();
  assert.equal(c.isPaused(), true);
  c.togglePause();
  assert.equal(c.isPaused(), false);
});

test('getSnapshot: payload mutable réutilisé (zéro-alloc)', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 2 });
  c.start(0);
  // Act
  const s1 = c.getSnapshot();
  c.tick(1);
  const s2 = c.getSnapshot();
  // Assert : même référence, valeurs mises à jour
  assert.equal(s1, s2);
  assert.equal(s2.speed, 2);
  assert.ok(Math.abs(s2.elapsedHours - 2) < 1e-12);
  assert.equal(s2.paused, false);
});

test('reset: remet l\'écoulé à zéro et nécessite un nouveau start', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 5 });
  c.start(0);
  c.tick(2);  // 10 h
  // Act
  c.reset();
  // Assert
  assert.equal(c.getElapsedHours(), 0);
  // Le prochain tick relance la référence sans avancer
  const d = c.tick(100);
  assert.equal(d, 0);
});

test('tick: dt réel ≤ 0 ignoré (anti-rollback chronomètre)', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 10 });
  c.start(5);
  c.tick(6);  // +10 h
  // Act
  c.tick(5.5); // dt négatif → ignoré
  // Assert
  assert.ok(Math.abs(c.getElapsedHours() - 10) < 1e-12);
});

test('Pas d\'allocation observable dans la boucle de tick', () => {
  // Arrange
  const c = new SimulationClock({ initialSpeed: 1 });
  c.start(0);
  const snapshotRef = c.getSnapshot();
  // Act : 10 000 ticks
  for (let i = 1; i <= 10000; i++) {
    c.tick(i * 0.016);
    // Assert : la référence du snapshot ne change jamais
    assert.equal(c.getSnapshot(), snapshotRef);
  }
});
