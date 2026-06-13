// Adaptateur de date civile pour le TimeStatus / fiches.
//
// Convention : `elapsedHours` est le temps de SIMULATION écoulé depuis le
// lancement de `animate()`. Pour afficher une date civile réelle (« 14 mars
// 2027 ») il faut un POINT D'ANCRAGE : une date d'origine paramétrable.
//
// Par défaut on ancre l'origine sur l'époque J2000.0 (2000-01-01 12:00 TT,
// soit 2000-01-01 11:58:55.816 UTC — différence négligeable pour l'UI).
//
// API pure : aucune lecture de l'horloge système, tout est paramètre.

import { hoursToSeconds } from './timeUnits.js';

/** Époque J2000.0 en TT, exprimée en UTC à la milliseconde près. */
export const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 11, 58, 55, 816);
export const J2000_EPOCH_DATE = new Date(J2000_EPOCH_MS);

/**
 * Convertit un temps simulé (en heures depuis l'origine) en `Date` civile.
 *
 * @param {number} elapsedHours    Peut être négatif (rewind).
 * @param {Date|number} [origin]   Date d'origine (défaut J2000_EPOCH). Si nombre,
 *                                 traité comme epoch ms.
 * @returns {Date}
 */
export function elapsedHoursToDate(elapsedHours, origin = J2000_EPOCH_DATE) {
  if (!Number.isFinite(elapsedHours)) {
    throw new TypeError('elapsedHoursToDate: elapsedHours non fini');
  }
  const originMs = origin instanceof Date ? origin.getTime() : Number(origin);
  if (!Number.isFinite(originMs)) {
    throw new TypeError('elapsedHoursToDate: origine invalide');
  }
  return new Date(originMs + hoursToSeconds(elapsedHours) * 1000);
}

/**
 * Inverse : convertit une `Date` cible en `elapsedHours` à fournir au moteur.
 * Utile pour "aller à 2055-12-21" via UI.
 *
 * @param {Date|number} target
 * @param {Date|number} [origin]
 * @returns {number}
 */
export function dateToElapsedHours(target, origin = J2000_EPOCH_DATE) {
  const targetMs = target instanceof Date ? target.getTime() : Number(target);
  const originMs = origin instanceof Date ? origin.getTime() : Number(origin);
  if (!Number.isFinite(targetMs) || !Number.isFinite(originMs)) {
    throw new TypeError('dateToElapsedHours: arguments invalides');
  }
  return (targetMs - originMs) / 3_600_000;
}

/**
 * Création d'un adaptateur lié à une origine. Renvoie deux fonctions
 * fermées sur l'origine pour usage dans les composants UI sans répéter
 * le paramètre.
 *
 * @param {Date|number|string} originLike
 */
export function createDateAdapter(originLike = J2000_EPOCH_DATE) {
  const origin = originLike instanceof Date
    ? originLike
    : new Date(originLike);
  if (Number.isNaN(origin.getTime())) {
    throw new TypeError('createDateAdapter: origine invalide');
  }
  return {
    origin,
    toDate: (elapsedHours) => elapsedHoursToDate(elapsedHours, origin),
    fromDate: (date) => dateToElapsedHours(date, origin),
  };
}

/**
 * Année civile (entière, calendrier grégorien proleptique) à un elapsedHours
 * donné — extraction zéro-alloc côté caller.
 */
export function elapsedHoursToCivilYear(elapsedHours, origin = J2000_EPOCH_DATE) {
  return elapsedHoursToDate(elapsedHours, origin).getUTCFullYear();
}
