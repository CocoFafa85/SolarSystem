// Résolution de l'équation de Kepler : M = E - e * sin(E)
// Méthode : Newton-Raphson avec amorçage adapté à toutes excentricités (0 ≤ e < 1).
// Référence : Danby, "Fundamentals of Celestial Mechanics", §6.6.

import {
  KEPLER_TOLERANCE,
  KEPLER_MAX_ITERATIONS,
  TWO_PI,
  wrapTwoPi,
} from './constants.js';

/**
 * Résout E à partir de M et e pour une orbite elliptique.
 * @param {number} meanAnomaly  Anomalie moyenne M (radians)
 * @param {number} eccentricity Excentricité e ∈ [0, 1)
 * @param {number} [tolerance]
 * @param {number} [maxIterations]
 * @returns {number} Anomalie excentrique E (radians, dans [0, 2π))
 */
export function solveKeplerEquation(
  meanAnomaly,
  eccentricity,
  tolerance = KEPLER_TOLERANCE,
  maxIterations = KEPLER_MAX_ITERATIONS,
) {
  if (!Number.isFinite(meanAnomaly) || !Number.isFinite(eccentricity)) {
    throw new TypeError('solveKeplerEquation: arguments non finis');
  }
  if (eccentricity < 0 || eccentricity >= 1) {
    throw new RangeError('solveKeplerEquation: excentricité hors [0, 1)');
  }

  const M = wrapTwoPi(meanAnomaly);

  // Amorçage : pour e faible E ≈ M ; pour e élevé on déporte vers π pour
  // éviter les oscillations près des apsides.
  let E = eccentricity < 0.8 ? M : Math.PI;

  for (let i = 0; i < maxIterations; i++) {
    const f = E - eccentricity * Math.sin(E) - M;
    const fPrime = 1 - eccentricity * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < tolerance) {
      return wrapTwoPi(E);
    }
  }

  throw new Error(
    `solveKeplerEquation: non-convergence (M=${meanAnomaly}, e=${eccentricity})`,
  );
}

/**
 * Convertit l'anomalie excentrique E en anomalie vraie ν.
 * Utilise atan2 pour éviter les ambiguïtés de quadrant.
 * @param {number} eccentricAnomaly E (radians)
 * @param {number} eccentricity     e ∈ [0, 1)
 * @returns {number} Anomalie vraie ν (radians, dans [0, 2π))
 */
export function trueAnomalyFromEccentric(eccentricAnomaly, eccentricity) {
  const E = eccentricAnomaly;
  const e = eccentricity;
  const sqrt1MinusE2 = Math.sqrt(1 - e * e);
  const nu = Math.atan2(sqrt1MinusE2 * Math.sin(E), Math.cos(E) - e);
  return wrapTwoPi(nu);
}

/**
 * Distance héliocentrique r en UA à partir de E.
 * Formule : r = a (1 - e cos E)
 */
export function heliocentricDistance(semiMajorAxisAu, eccentricity, eccentricAnomaly) {
  return semiMajorAxisAu * (1 - eccentricity * Math.cos(eccentricAnomaly));
}

export { TWO_PI };
