// Math pure pour l'orientation des axes de rotation des astres.
//
// Convention scène : repère écliptique J2000, plan orbital = XY world,
//                    +Z world = pôle nord écliptique (normale à l'écliptique).
//
// Convention Three.js : un mesh sphère a son axe de spin par défaut le long
//                       de SON Y LOCAL.
//
// L'obliquité ε est définie astronomiquement comme l'angle entre l'axe de
// rotation et la NORMALE au plan orbital (donc +Z world dans notre cas).
//
// BUG legacy corrigé : l'ancien code faisait `axialTilt.rotation.x = ε`,
// ce qui inclinait l'axe Y du mesh par ε depuis Y world — c'est-à-dire que
// pour ε=0 l'axe de spin restait dans le PLAN orbital (+Y), au lieu d'être
// perpendiculaire à celui-ci (+Z). Toutes les rotations diurnes étaient donc
// fausses (Soleil et planètes tournaient "couchés").
//
// Correction : on veut, après application sur (0,1,0), obtenir un axe
//   a(ε) = (0, sin ε, cos ε)
// qui est bien à l'angle ε de +Z. Une rotation autour de X d'angle θ envoie
// (0,1,0) → (0, cos θ, sin θ). On résout :
//   cos θ = sin ε  et  sin θ = cos ε   ⇒   θ = π/2 − ε.

import { degToRad } from '../physics/constants.js';

/**
 * Angle (rad) à appliquer en `Group.rotation.x` pour que la sphère enfant
 * tourne autour d'un axe à `obliquityDeg` du pôle écliptique (+Z world).
 *
 *  - ε = 0   → π/2   (axe spin = +Z world, prograde "vertical")
 *  - ε = π/2 → 0     (axe spin couché dans l'écliptique, type Uranus)
 *  - ε = π   → −π/2  (axe spin = −Z world, rotation rétrograde "à l'envers")
 *
 * @param {number} obliquityDeg
 * @returns {number} rotation.x à appliquer
 */
export function obliquityToTiltRotationX(obliquityDeg) {
  if (!Number.isFinite(obliquityDeg)) {
    throw new TypeError('obliquityToTiltRotationX: obliquityDeg non fini');
  }
  return Math.PI / 2 - degToRad(obliquityDeg);
}

/**
 * Vitesse angulaire (rad/heure) de rotation propre à partir de la période
 * sidérale (en heures terrestres). Une période négative encode la rétrograde.
 *
 * Retourne 0 pour les corps tidalement bloqués ou sans rotation définie.
 *
 * @param {number} rotationPeriodHours
 * @returns {number} rad / heure
 */
export function rotationOmegaPerHour(rotationPeriodHours) {
  if (!Number.isFinite(rotationPeriodHours) || rotationPeriodHours === 0) return 0;
  return (2 * Math.PI) / rotationPeriodHours;
}
