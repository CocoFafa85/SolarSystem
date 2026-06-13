// Cycle solaire — moteur d'éruptions massives procédural.
//
// Modélisation : le cycle solaire moyen est de 11.0 ans (cycle de Schwabe).
// On répartit les éruptions massives autour du maximum solaire (mi-cycle)
// selon une fenêtre d'activité paramétrable. À l'intérieur de la fenêtre,
// la probabilité d'une éruption est modulée par une enveloppe gaussienne
// centrée sur le maximum.
//
// API pure : la fonction ne prend pas d'aléa, elle prend un RNG injecté
// (testabilité totale). Sortie : { active, intensity ∈ [0,1] }.

import { HOURS_PER_YEAR } from './constants.js';

const DEFAULT_PERIOD_YEARS = 11.0;
const DEFAULT_WINDOW_YEARS = 4.0; // ±2 ans autour du maximum
const DEFAULT_PEAK_OFFSET_YEARS = 5.5; // maximum à mi-cycle

/**
 * Phase normalisée dans le cycle, dans [0, periodYears).
 */
export function cyclePhaseYears(elapsedHours, periodYears = DEFAULT_PERIOD_YEARS) {
  const periodHours = periodYears * HOURS_PER_YEAR;
  if (periodHours <= 0) {
    throw new RangeError('cyclePhaseYears: periodYears doit être > 0');
  }
  const t = elapsedHours % periodHours;
  const phaseHours = t < 0 ? t + periodHours : t;
  return phaseHours / HOURS_PER_YEAR;
}

/**
 * Intensité instantanée du cycle ∈ [0, 1] : 0 au minimum solaire, 1 au maximum.
 * Profil gaussien centré sur `peakOffsetYears` avec σ = window / 2.
 */
export function solarActivityIntensity(elapsedHours, opts = {}) {
  const period = opts.periodYears ?? DEFAULT_PERIOD_YEARS;
  const peak = opts.peakOffsetYears ?? DEFAULT_PEAK_OFFSET_YEARS;
  const window = opts.windowYears ?? DEFAULT_WINDOW_YEARS;
  const phase = cyclePhaseYears(elapsedHours, period);
  const sigma = window / 2;
  const dt = phase - peak;
  // Gaussienne normalisée à 1 au pic.
  return Math.exp(-(dt * dt) / (2 * sigma * sigma));
}

/**
 * Variante ZÉRO-ALLOC d'`evaluateSolarFlare` : écrit dans un buffer fourni.
 * Contrat Profile C #2 — destinée à la RAF, aucun objet créé par appel.
 *
 * @param {number} elapsedHours
 * @param {object} opts            mêmes options qu'`evaluateSolarFlare`
 * @param {{active:boolean, intensity:number, phaseYears:number}} out
 *                                 buffer mutable réutilisable
 * @returns {{active:boolean, intensity:number, phaseYears:number}} out (même réf)
 */
export function evaluateSolarFlareInto(elapsedHours, opts = {}, out) {
  if (!out) throw new TypeError('evaluateSolarFlareInto: buffer "out" requis');
  const rng = opts.rng ?? Math.random;
  // LOT 9 (revu) — sémantique "éruption solaire MAJEURE" (rare visuelle, type
  // CME planétaire) : cible ≈ 1 par cycle de Schwabe (11 ans), soit 2-4 sur
  // une fenêtre de 25 ans. 0.0005/jour pondéré par l'enveloppe gaussienne du
  // cycle donne un λ intégré d'environ 3 sur 25 ans (≈ 1 par maximum solaire).
  // Les classes X/M5+ ordinaires (~120/25y NOAA) ne sont PAS modélisées ici —
  // c'est une "éruption majeure" event-driven, pas un compteur continu.
  const baseProb = opts.baseProbabilityPerDay ?? 0.0005;
  const deltaHours = opts.deltaHours ?? 0;

  const intensity = solarActivityIntensity(elapsedHours, opts);
  const phaseYears = cyclePhaseYears(elapsedHours, opts.periodYears ?? DEFAULT_PERIOD_YEARS);

  out.intensity = intensity;
  out.phaseYears = phaseYears;

  if (deltaHours <= 0 || intensity <= 0) {
    out.active = false;
    return out;
  }
  // Probabilité d'occurrence sur l'intervalle Δt — modèle Poisson.
  const lambda = baseProb * intensity * (deltaHours / 24);
  const probTrigger = 1 - Math.exp(-lambda);
  out.active = rng() < probTrigger;
  return out;
}

/**
 * Évalue si une éruption massive doit se déclencher cette frame.
 *
 * Variante alloue-à-chaque-appel — conservée pour compat (tests legacy + appels
 * hors RAF). Pour la RAF, préférer `evaluateSolarFlareInto` avec un buffer
 * persistant.
 *
 * @param {number} elapsedHours
 * @param {object} [opts]
 * @returns {{ active: boolean, intensity: number, phaseYears: number }}
 */
export function evaluateSolarFlare(elapsedHours, opts = {}) {
  return evaluateSolarFlareInto(
    elapsedHours,
    opts,
    { active: false, intensity: 0, phaseYears: 0 },
  );
}

export { DEFAULT_PERIOD_YEARS, DEFAULT_WINDOW_YEARS, DEFAULT_PEAK_OFFSET_YEARS };
