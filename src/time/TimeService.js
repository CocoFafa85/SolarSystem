// TimeService — pont entre la SimulationClock et l'EventBus UI.
// - Reçoit les commandes UI.* et les applique à l'horloge.
// - Émet ENGINE.TIME_CHANGED au format attendu par TimeStatus.
// - Aucune allocation par tick : on ré-émet le snapshot mutable de la clock.

import * as bus from '../ui/core/eventBus.js';
import { UI, ENGINE } from '../ui/core/channels.js';
import { SimulationClock } from './SimulationClock.js';
import { createDateAdapter } from './dateAdapter.js';

/**
 * @param {{
 *   clock?: SimulationClock,
 *   emitOnCommand?: boolean,
 *   dateAdapter?: ReturnType<typeof createDateAdapter>,
 * }} [opts]
 *
 * LOT 5 : le `dateAdapter` (par défaut J2000.0) est interrogé à chaque émission
 * et le résultat est PERSISTÉ sur le snapshot mutable de la clock :
 *   - `snapshot.civilDateMs`   : timestamp epoch ms (zéro alloc, Number primitif)
 *   - `snapshot.civilYear`     : Number primitif
 *
 * Choix architectural : on N'attache PAS l'objet `Date` (allocation par tick).
 * Les consommateurs UI qui veulent un Date complet appellent `dateAdapter.toDate`
 * eux-mêmes (paie l'allocation côté UI throttlée à 100 ms).
 */
export function createTimeService({
  clock = new SimulationClock(),
  emitOnCommand = true,
  dateAdapter = createDateAdapter(),
} = {}) {
  const unsubs = [];

  const emitChanged = () => {
    // Snapshot mutable réutilisé — aucun objet créé ici.
    const snap = clock.getSnapshot();
    // Conversion zéro-alloc : Date interne créée par dateAdapter.toDate puis
    // jetée immédiatement (gen-0 court-vivant). Les CHAMPS attachés au snapshot
    // sont des primitives, donc le snapshot reste mutable et stable en identité.
    const d = dateAdapter.toDate(snap.elapsedHours);
    snap.civilDateMs = d.getTime();
    snap.civilYear = d.getUTCFullYear();
    bus.emit(ENGINE.TIME_CHANGED, snap);
  };

  unsubs.push(bus.on(UI.TIME_PLAY, () => {
    clock.setPaused(false);
    if (emitOnCommand) emitChanged();
  }));
  unsubs.push(bus.on(UI.TIME_PAUSE, () => {
    clock.setPaused(true);
    if (emitOnCommand) emitChanged();
  }));
  unsubs.push(bus.on(UI.TIME_TOGGLE, () => {
    clock.togglePause();
    if (emitOnCommand) emitChanged();
  }));
  unsubs.push(bus.on(UI.TIME_SET_SPEED, (payload) => {
    if (payload && Number.isFinite(payload.speed)) {
      clock.setSpeed(payload.speed);
      if (emitOnCommand) emitChanged();
    }
  }));
  unsubs.push(bus.on(UI.TIME_STEP_SPEED, (payload) => {
    if (payload && Number.isFinite(payload.factor) && payload.factor !== 0) {
      clock.stepSpeed(payload.factor);
      if (emitOnCommand) emitChanged();
    }
  }));
  // LOT 5C — Reset/Time 0 complet :
  //   1. remet l'horloge à zéro,
  //   2. force la pause (l'utilisateur doit explicitement relancer la simu),
  //   3. émet ENGINE.SCENE_RESET pour que la scène se réaligne (motionUpdater,
  //      asteroidBeltUpdater, EclipseTracker…),
  //   4. ré-émet ENGINE.TIME_CHANGED pour que TimeStatus / EventStats / UI se
  //      recalent sur l'epoch civil et les compteurs vides.
  unsubs.push(bus.on(UI.TIME_RESET, () => {
    clock.reset();
    clock.setPaused(true);
    // LOT 9 — restaurer la vitesse par défaut (1× = 1 heure simulée / s réelle).
    // L'utilisateur ne doit pas retrouver son ×64 / ×1024 après un retour J2000.
    clock.setSpeed(1);
    bus.emit(ENGINE.SCENE_RESET, null);
    if (emitOnCommand) emitChanged();
  }));

  return {
    clock,
    dateAdapter,
    /** À appeler une fois au lancement d'animate(). */
    start(nowSeconds) {
      clock.start(nowSeconds);
      emitChanged();
    },
    /** À appeler à chaque frame depuis la RAF. */
    tick(nowSeconds) {
      clock.tick(nowSeconds);
      emitChanged();
    },
    destroy() {
      for (const u of unsubs) u();
      unsubs.length = 0;
    },
  };
}
