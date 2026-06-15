// SolarFlareDetector — pont entre le moteur de cycle solaire (cycle de Schwabe)
// et l'EventBus UI/ENGINE.
//
// Pattern strictement aligné sur EclipseTracker (LOT 5B) :
//   - state interne minimal (wasActive, inFlareUntilHours)
//   - payloads d'événement pré-alloués au scope module, mutés en place
//   - tick() consomme un snapshot mutable de la SimulationClock
//   - ZÉRO `new` par appel, ZÉRO littéral object/array dans le hot path
//
// Émet :
//   - ENGINE.SOLAR_FLARE_START   { intensity }
//   - ENGINE.SOLAR_FLARE_END     null
//   - ENGINE.EVENT_DETECTED      { type: 'solarFlare', at }
//
// L'intensité émise est celle calculée AU DÉCLENCHEMENT ; elle ne varie pas
// pendant la durée de l'éruption (cohérent avec le SolarFlareAlert qui
// affiche un état "en cours"). Pour une intensité variable, exposer via
// getCurrentIntensity() (non requis par le contrat UI actuel).

import * as bus from '../ui/core/eventBus.js';
import { ENGINE } from '../ui/core/channels.js';
import { evaluateSolarFlareInto } from './solarCycle.js';

const DEFAULT_FLARE_DURATION_HOURS = 720; // LOT 16 #7 — 30 jours simulés (×3) pour glow + long

/**
 * @param {{
 *   timeService: { clock: { getSnapshot: () => { elapsedHours:number, deltaHours:number } } },
 *   flareDurationHours?: number,
 *   rng?: () => number,
 *   baseProbabilityPerDay?: number,
 *   periodYears?: number,
 *   peakOffsetYears?: number,
 *   windowYears?: number,
 * }} cfg
 */
export function createSolarFlareDetector(cfg) {
  if (!cfg || !cfg.timeService?.clock?.getSnapshot) {
    throw new Error('createSolarFlareDetector: timeService.clock requis');
  }

  const flareDurationHours = cfg.flareDurationHours ?? DEFAULT_FLARE_DURATION_HOURS;
  const rng = cfg.rng ?? Math.random;

  // Options d'évaluation, gelées à la construction (rng inclus).
  // Réutilisé en lecture seule à chaque tick — aucune allocation.
  const evalOpts = {
    rng,
    baseProbabilityPerDay: cfg.baseProbabilityPerDay,
    periodYears: cfg.periodYears,
    peakOffsetYears: cfg.peakOffsetYears,
    windowYears: cfg.windowYears,
    deltaHours: 0, // muté à chaque tick
  };

  // Payloads pré-alloués — bus.emit transmet la référence ; les abonnés
  // doivent lire immédiatement (compatible throttle UI 100 ms).
  const startPayload = { intensity: 0 };
  const eventPayload = { type: 'solarFlare', at: 0 };
  const scratch = { active: false, intensity: 0, phaseYears: 0 };

  // État du détecteur.
  let wasActive = false;
  let inFlareUntilHours = 0;
  const counters = { solarFlare: 0 };

  function tick() {
    const snap = cfg.timeService.clock.getSnapshot();
    if (snap.deltaHours === 0) return;

    // Mute deltaHours (chemin chaud) — aucun spread, aucune allocation.
    evalOpts.deltaHours = snap.deltaHours;
    evaluateSolarFlareInto(snap.elapsedHours, evalOpts, scratch);

    if (!wasActive && scratch.active) {
      // Front montant : nouvelle éruption.
      wasActive = true;
      inFlareUntilHours = snap.elapsedHours + flareDurationHours;
      counters.solarFlare++;

      startPayload.intensity = scratch.intensity;
      bus.emit(ENGINE.SOLAR_FLARE_START, startPayload);

      eventPayload.at = snap.elapsedHours;
      bus.emit(ENGINE.EVENT_DETECTED, eventPayload);
    } else if (wasActive && snap.elapsedHours >= inFlareUntilHours) {
      // Front descendant : fin de l'éruption courante.
      wasActive = false;
      bus.emit(ENGINE.SOLAR_FLARE_END, null);
    }
  }

  function reset() {
    wasActive = false;
    inFlareUntilHours = 0;
    counters.solarFlare = 0;
  }

  return {
    tick,
    reset,
    getCounters() { return counters; },
    /** Lecture utile aux tests/diagnostics, pas exposée à la RAF. */
    isActive() { return wasActive; },
  };
}
