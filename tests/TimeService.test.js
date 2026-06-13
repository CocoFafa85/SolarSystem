import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as bus from '../src/ui/core/eventBus.js';
import { UI, ENGINE } from '../src/ui/core/channels.js';
import { createTimeService } from '../src/time/TimeService.js';
import { SimulationClock } from '../src/time/SimulationClock.js';

beforeEach(() => bus.clear());

test('UI.TIME_SET_SPEED → clock.setSpeed + ENGINE.TIME_CHANGED émis', () => {
  // Arrange
  const events = [];
  bus.on(ENGINE.TIME_CHANGED, (p) => events.push({ speed: p.speed, paused: p.paused }));
  const svc = createTimeService();
  events.length = 0;

  // Act
  bus.emit(UI.TIME_SET_SPEED, { speed: 42 });

  // Assert
  assert.equal(svc.clock.getSpeed(), 42);
  assert.equal(events.length, 1);
  assert.equal(events[0].speed, 42);

  svc.destroy();
});

test('UI.TIME_STEP_SPEED multiplie la vitesse', () => {
  // Arrange
  const clock = new SimulationClock({ initialSpeed: 3 });
  const svc = createTimeService({ clock });

  // Act
  bus.emit(UI.TIME_STEP_SPEED, { factor: 4 });

  // Assert
  assert.equal(clock.getSpeed(), 12);
  svc.destroy();
});

test('UI.TIME_TOGGLE inverse l\'état pause', () => {
  // Arrange
  const svc = createTimeService();
  // Act
  bus.emit(UI.TIME_TOGGLE, null);
  // Assert
  assert.equal(svc.clock.isPaused(), true);
  bus.emit(UI.TIME_TOGGLE, null);
  assert.equal(svc.clock.isPaused(), false);
  svc.destroy();
});

test('UI.TIME_PLAY et UI.TIME_PAUSE forcent l\'état', () => {
  const svc = createTimeService();
  bus.emit(UI.TIME_PAUSE);
  assert.equal(svc.clock.isPaused(), true);
  bus.emit(UI.TIME_PLAY);
  assert.equal(svc.clock.isPaused(), false);
  svc.destroy();
});

test('tick(t) → ENGINE.TIME_CHANGED contient elapsedHours, speed, paused', () => {
  // Arrange
  let last = null;
  bus.on(ENGINE.TIME_CHANGED, (p) => { last = { ...p }; });
  const svc = createTimeService({ clock: new SimulationClock({ initialSpeed: 10 }) });

  // Act
  svc.start(0);
  svc.tick(1);

  // Assert
  assert.equal(last.speed, 10);
  assert.equal(last.paused, false);
  assert.ok(Math.abs(last.elapsedHours - 10) < 1e-9);
  svc.destroy();
});

test('Le payload émis est le snapshot mutable (zéro-alloc)', () => {
  // Arrange
  const refs = [];
  bus.on(ENGINE.TIME_CHANGED, (p) => refs.push(p));
  const svc = createTimeService();
  // Act
  svc.start(0);
  svc.tick(1);
  svc.tick(2);
  // Assert : c'est toujours la même référence
  assert.ok(refs.length >= 2);
  assert.equal(refs[0], refs[1]);
  svc.destroy();
});

test('destroy() coupe tous les abonnements', () => {
  // Arrange
  const svc = createTimeService();
  // Act
  svc.destroy();
  bus.emit(UI.TIME_SET_SPEED, { speed: 999 });
  // Assert : la clock n'a pas bougé
  assert.notEqual(svc.clock.getSpeed(), 999);
});

test('Payload UI.TIME_SET_SPEED invalide ignoré', () => {
  const svc = createTimeService({ clock: new SimulationClock({ initialSpeed: 7 }) });
  bus.emit(UI.TIME_SET_SPEED, { speed: NaN });
  bus.emit(UI.TIME_SET_SPEED, null);
  bus.emit(UI.TIME_SET_SPEED, {});
  assert.equal(svc.clock.getSpeed(), 7);
  svc.destroy();
});
