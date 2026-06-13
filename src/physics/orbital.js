// Transformation des éléments képlériens classiques (a, e, i, Ω, ω, M)
// vers une position cartésienne 3D dans le repère écliptique J2000 héliocentrique.
//
// Sortie : { x, y, z } en UA, plan écliptique = plan XY, axe Z = pôle nord
// écliptique. Ce repère est ensuite consommé tel quel par Three.js (1 unité = 1 UA).
//
// Convention angulaire (IAU) :
//   Ω : longitude du nœud ascendant
//   i : inclinaison sur l'écliptique
//   ω : argument du périhélie
//   M : anomalie moyenne à l'époque + n·(t - t0)
//
// Référence : Vallado, "Fundamentals of Astrodynamics and Applications", §2.6.

import {
  solveKeplerEquation,
  trueAnomalyFromEccentric,
  heliocentricDistance,
} from './kepler.js';
import { degToRad, MU_SUN_AU3_PER_DAY2, TWO_PI, wrapTwoPi } from './constants.js';

/**
 * @typedef {Object} OrbitalElementsDeg
 * @property {number} semiMajorAxisAu
 * @property {number} eccentricity
 * @property {number} inclinationDeg
 * @property {number} longitudeAscendingNodeDeg   (Ω)
 * @property {number} argumentPerihelionDeg       (ω)
 * @property {number} meanAnomalyDeg              (M à l'instant courant)
 */

/**
 * Convertit des éléments orbitaux en position héliocentrique écliptique.
 * @param {OrbitalElementsDeg} elements
 * @returns {{x:number, y:number, z:number, r:number, trueAnomaly:number}}
 */
export function orbitalElementsToHeliocentric(elements) {
  return evaluateOrbitalElementsInto(
    elements,
    { x: 0, y: 0, z: 0, r: 0, trueAnomaly: 0 },
  );
}

/**
 * Variante ZÉRO-ALLOC d'`orbitalElementsToHeliocentric`.
 * Le caller passe un buffer mutable qui sera muté et retourné. Aucun objet
 * n'est créé. Destiné aux mises à jour par-frame de gros lots (asteroidBelt
 * ×100, cometSystem, motionUpdater LOT 6+).
 *
 * @param {OrbitalElementsDeg} elements
 * @param {{x:number, y:number, z:number, r:number, trueAnomaly:number}} out
 * @returns {{x:number, y:number, z:number, r:number, trueAnomaly:number}} out (même réf)
 */
export function evaluateOrbitalElementsInto(elements, out) {
  if (!out) throw new TypeError('evaluateOrbitalElementsInto: buffer "out" requis');

  const a = elements.semiMajorAxisAu;
  const e = elements.eccentricity;
  const iRad = degToRad(elements.inclinationDeg);
  const omegaRad = degToRad(elements.longitudeAscendingNodeDeg);   // Ω
  const wRad = degToRad(elements.argumentPerihelionDeg);           // ω
  const mRad = degToRad(elements.meanAnomalyDeg);                  // M

  // 1) Kepler → E
  const E = solveKeplerEquation(mRad, e);

  // 2) ν et distance
  const nu = trueAnomalyFromEccentric(E, e);
  const r = heliocentricDistance(a, e, E);

  // 3) Plan orbital (X vers le périhélie)
  const xOrb = r * Math.cos(nu);
  const yOrb = r * Math.sin(nu);

  // 4) Rotation Rz(Ω) · Rx(i) · Rz(ω) appliquée à (xOrb, yOrb, 0), développée.
  const cosO = Math.cos(omegaRad);
  const sinO = Math.sin(omegaRad);
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);
  const cosW = Math.cos(wRad);
  const sinW = Math.sin(wRad);

  const cosNu = xOrb / r;
  const sinNu = yOrb / r;
  const cosWNu = cosW * cosNu - sinW * sinNu;
  const sinWNu = sinW * cosNu + cosW * sinNu;

  out.x = r * (cosO * cosWNu - sinO * sinWNu * cosI);
  out.y = r * (sinO * cosWNu + cosO * sinWNu * cosI);
  out.z = r * (sinWNu * sinI);
  out.r = r;
  out.trueAnomaly = nu;
  return out;
}

/**
 * Position héliocentrique à une anomalie vraie ν donnée (sans passer par M).
 * Utile pour échantillonner des points caractéristiques de l'orbite
 * (équinoxes, solstices, périhélie, aphélie, longitude héliocentrique cible).
 *
 * @param {OrbitalElementsDeg} elements
 * @param {number} trueAnomalyRad
 * @returns {{x:number, y:number, z:number, r:number}}
 */
export function positionAtTrueAnomaly(elements, trueAnomalyRad) {
  const a = elements.semiMajorAxisAu;
  const e = elements.eccentricity;
  const iRad = degToRad(elements.inclinationDeg);
  const omegaRad = degToRad(elements.longitudeAscendingNodeDeg);
  const wRad = degToRad(elements.argumentPerihelionDeg);
  const nu = wrapTwoPi(trueAnomalyRad);

  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));

  const cosO = Math.cos(omegaRad);
  const sinO = Math.sin(omegaRad);
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);
  const cosWNu = Math.cos(wRad + nu);
  const sinWNu = Math.sin(wRad + nu);

  return {
    x: r * (cosO * cosWNu - sinO * sinWNu * cosI),
    y: r * (sinO * cosWNu + cosO * sinWNu * cosI),
    z: r * (sinWNu * sinI),
    r,
  };
}

/**
 * Moyen mouvement n (rad/jour) selon la 3e loi de Kepler.
 *   n = sqrt(μ / a³)  avec μ en UA³/jour².
 */
export function meanMotionRadPerDay(semiMajorAxisAu) {
  if (semiMajorAxisAu <= 0) {
    throw new RangeError('meanMotionRadPerDay: a doit être > 0');
  }
  return Math.sqrt(MU_SUN_AU3_PER_DAY2 / (semiMajorAxisAu ** 3));
}

/**
 * Période orbitale T en jours terrestres (≠ "jour" générique).
 *   T = 2π / n
 */
export function orbitalPeriodDays(semiMajorAxisAu) {
  return TWO_PI / meanMotionRadPerDay(semiMajorAxisAu);
}

/**
 * Avance l'anomalie moyenne M(t) = M0 + n·Δt (Δt en jours).
 * Retourne un nouvel objet d'éléments orbitaux (M mis à jour, autres champs inchangés).
 */
export function propagateMeanAnomaly(elements, deltaDays) {
  const nRadPerDay = meanMotionRadPerDay(elements.semiMajorAxisAu);
  const newMRad = degToRad(elements.meanAnomalyDeg) + nRadPerDay * deltaDays;
  const newMDeg = ((newMRad * 180) / Math.PI) % 360;
  return {
    ...elements,
    meanAnomalyDeg: newMDeg < 0 ? newMDeg + 360 : newMDeg,
  };
}
