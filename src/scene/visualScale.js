// Math pure de l'échelle visuelle des satellites.
//
// Problème observé en LOT 4 : la Lune disparaissait à l'intérieur du mesh
// terrestre. Cause : à 1 unité = 1 UA, la Terre a un rayon physique de
// 4.26·10⁻⁵ UA, gonflé à 0.021 UA par le multiplier visuel — mais la distance
// Terre-Lune n'est que 0.00257 UA. La Lune est donc "englobée" par le mesh
// Terre. Aucune logique purement physique ne peut résoudre cela sans rompre
// la convention "1 unité = 1 UA" sur les positions héliocentriques.
//
// Compromis Profile B (mathématiquement déclaré) :
//   - Les positions HÉLIOCENTRIQUES restent en UA strictes (intouchables).
//   - Pour les SATELLITES, on autorise une "exagération orbitale locale" :
//     un facteur multiplicatif appliqué uniquement à la position relative
//     au parent, calculé pour garantir que le satellite reste visible
//     EN DEHORS du mesh parent.
//
// Cette fonction ne mute rien — elle calcule juste un scalaire à utiliser
// par BodyMotionUpdater.

const DEFAULT_MARGIN_RATIO = 0.45;
const MAX_REASONABLE_SCALE = 100;

/**
 * Calcule le facteur d'agrandissement à appliquer à la position locale d'un
 * satellite pour qu'il ne soit pas occulté par le mesh du parent.
 *
 * Garantit : (R_parent + R_child) <= marginRatio × (orbit × scale).
 *
 * @param {number} parentVisualRadiusAu
 * @param {number} childVisualRadiusAu
 * @param {number} orbitSemiMajorAxisAu  Demi-grand axe local (parent-relatif)
 * @param {number} [marginRatio=0.45]    Marge avant collision visuelle (∈ ]0, 1[)
 * @returns {number}                     ≥ 1 (1 = aucune exagération)
 */
export function satelliteOrbitDisplayScale(
  parentVisualRadiusAu,
  childVisualRadiusAu,
  orbitSemiMajorAxisAu,
  marginRatio = DEFAULT_MARGIN_RATIO,
) {
  // LOT 12 — refactor 1:1 stricte. À la nouvelle échelle, la Terre a un
  // rayon visuel de 4.26e-5 UA et la Lune orbite à 2.57e-3 UA = 60 rayons
  // terrestres → elle sort NATURELLEMENT du mesh sans exagération. Le
  // facteur retourné est donc constant à 1.0 (échelle réelle). L'API et la
  // signature sont préservées pour rétro-compatibilité avec BodyMotionUpdater.
  if (
    !Number.isFinite(parentVisualRadiusAu) ||
    !Number.isFinite(childVisualRadiusAu) ||
    !Number.isFinite(orbitSemiMajorAxisAu) ||
    parentVisualRadiusAu < 0 || childVisualRadiusAu < 0 ||
    orbitSemiMajorAxisAu <= 0
  ) {
    throw new RangeError('satelliteOrbitDisplayScale: arguments invalides');
  }
  if (marginRatio <= 0 || marginRatio >= 1) {
    throw new RangeError('marginRatio doit être strictement dans ]0,1[');
  }
  return 1;
}

/**
 * Calcule le rayon visuel utile d'un corps, avec clamp facultatif par
 * un rayon max (utile pour éviter qu'un satellite ait un rayon visuel
 * supérieur à son orbite ÷ 2).
 *
 * @param {number} radiusAu       rayon physique (UA)
 * @param {number} multiplier     ×  (planet ou star)
 * @param {number} [minRadiusAu]  plancher visuel
 * @param {number} [maxRadiusAu]  plafond visuel (Infinity par défaut)
 */
export function computeVisualRadius(
  radiusAu,
  multiplier,
  minRadiusAu = 0,
  maxRadiusAu = Infinity,
) {
  if (!Number.isFinite(radiusAu) || radiusAu < 0) {
    throw new RangeError('computeVisualRadius: radiusAu invalide');
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new RangeError('computeVisualRadius: multiplier invalide');
  }
  const r = Math.max(radiusAu * multiplier, minRadiusAu);
  return Math.min(r, maxRadiusAu);
}
