// Constantes physiques et de référence pour le moteur mathématique.
// Échelle stricte : 1 unité scène = 1 UA. Angles internes en radians.

export const KM_PER_AU = 149597870.7;

// Conversions temporelles (référence : heures terrestres, cf. bodies.json).
export const HOURS_PER_DAY = 24;
export const HOURS_PER_YEAR = 8760;        // année julienne courte (365 j)
export const HOURS_PER_JULIAN_YEAR = 8766; // 365.25 j (utilisé pour la précession)
export const SECONDS_PER_HOUR = 3600;

// Constante gravitationnelle héliocentrique de Gauss au carré (k² en UA³/jour²).
// Utilisée pour la 3e loi de Kepler en unités astronomiques.
export const GAUSSIAN_K = 0.01720209895;
export const MU_SUN_AU3_PER_DAY2 = GAUSSIAN_K * GAUSSIAN_K;

// Tolérance numérique par défaut du solveur de Kepler (≈ 1e-7 rad ≈ 0.02").
export const KEPLER_TOLERANCE = 1e-12;
export const KEPLER_MAX_ITERATIONS = 64;

export const TWO_PI = Math.PI * 2;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

/** Normalise un angle dans [0, 2π). */
export function wrapTwoPi(angle) {
  const m = angle % TWO_PI;
  return m < 0 ? m + TWO_PI : m;
}

export function degToRad(deg) { return deg * DEG_TO_RAD; }
export function radToDeg(rad) { return rad * RAD_TO_DEG; }
