// Conversions temporelles pures, sans état, sans allocation.
// Référence : heures terrestres (cf. bodies.json).

import { HOURS_PER_DAY, HOURS_PER_YEAR, SECONDS_PER_HOUR } from '../physics/constants.js';

export function hoursToDays(h) { return h / HOURS_PER_DAY; }
export function hoursToYears(h) { return h / HOURS_PER_YEAR; }

export function daysToHours(d) { return d * HOURS_PER_DAY; }
export function yearsToHours(y) { return y * HOURS_PER_YEAR; }

export function secondsToHours(s) { return s / SECONDS_PER_HOUR; }
export function hoursToSeconds(h) { return h * SECONDS_PER_HOUR; }

/**
 * Décompose un nombre d'heures écoulées en (années, jours, heures).
 * Aucune allocation : le caller fournit le buffer de sortie qui sera muté.
 * @param {number} totalHours  Doit être fini, peut être négatif (rewind).
 * @param {{years:number, days:number, hours:number}} out
 * @returns {{years:number, days:number, hours:number}} out (même référence)
 */
export function decomposeHours(totalHours, out) {
  if (!out) throw new TypeError('decomposeHours: buffer "out" requis (zéro-alloc)');
  if (!Number.isFinite(totalHours)) {
    out.years = 0; out.days = 0; out.hours = 0;
    return out;
  }
  const sign = totalHours < 0 ? -1 : 1;
  const abs = Math.abs(totalHours);
  const totalDays = Math.floor(abs / HOURS_PER_DAY);
  const remHours = abs - totalDays * HOURS_PER_DAY;
  const years = Math.floor(abs / HOURS_PER_YEAR);
  // jours résiduels dans l'année courante (365 j convention bodies.json)
  const daysInYear = totalDays - years * (HOURS_PER_YEAR / HOURS_PER_DAY);
  out.years = sign * years;
  out.days = sign * daysInYear;
  out.hours = sign * remHours;
  return out;
}
