// Calcul des 4 repères cardinaux de l'orbite terrestre :
// équinoxes (vernal / automnal) et solstices (été / hiver).
//
// Convention héliocentrique écliptique J2000 :
//   - +X = direction du point vernal (γ).
//   - Le point vernal est le moment où, vu de la Terre, le Soleil traverse
//     l'équateur céleste en direction de +X.
//   - Cela correspond à une POSITION HÉLIOCENTRIQUE de la Terre opposée :
//     longitude héliocentrique L = 180°.
//   - Convention astronomique standard pour les 3 autres :
//        Solstice d'été      → L = 270°
//        Équinoxe d'automne  → L =   0°
//        Solstice d'hiver    → L =  90°
//   - Longitude héliocentrique : L = Ω + ω + ν   (mod 360°).
//
// Sortie : 4 positions 3D en UA, prêtes à être tracées sur l'orbite Three.js.

import { positionAtTrueAnomaly } from './orbital.js';
import { degToRad, wrapTwoPi } from './constants.js';

const MARKER_LONGITUDES_DEG = Object.freeze({
  vernalEquinox: 180,
  summerSolstice: 270,
  autumnalEquinox: 0,
  winterSolstice: 90,
});

/**
 * @param {import('./orbital.js').OrbitalElementsDeg} earthElements
 * @returns {{
 *   vernalEquinox:   {x:number,y:number,z:number,r:number},
 *   summerSolstice:  {x:number,y:number,z:number,r:number},
 *   autumnalEquinox: {x:number,y:number,z:number,r:number},
 *   winterSolstice:  {x:number,y:number,z:number,r:number},
 * }}
 */
export function computeEarthSeasonMarkers(earthElements) {
  if (!earthElements) {
    throw new TypeError('computeEarthSeasonMarkers: éléments orbitaux requis');
  }
  const omegaPlusW =
    earthElements.longitudeAscendingNodeDeg + earthElements.argumentPerihelionDeg;

  const result = {};
  for (const [name, Ldeg] of Object.entries(MARKER_LONGITUDES_DEG)) {
    // ν = L_target - Ω - ω
    const nu = wrapTwoPi(degToRad(Ldeg - omegaPlusW));
    result[name] = positionAtTrueAnomaly(earthElements, nu);
  }
  return result;
}

export { MARKER_LONGITUDES_DEG };
