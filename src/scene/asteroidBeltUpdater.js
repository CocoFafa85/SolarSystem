// AsteroidBeltUpdater — propagation Kepler de la ceinture ×100, zéro alloc.
//
// LOT 6 : refonte sur `evaluateOrbitalElementsInto(orb, out)` livré par
// Session B. L'objet `out` est un littéral module-scope réutilisé →
// aucune allocation gen-0 par astéroïde par frame (vs. 1 objet/astéroïde
// dans la version `orbitalElementsToHeliocentric` originelle).
//
// Pour 15 000 astéroïdes à 60 fps : 900 000 allocations/s économisées.

import { evaluateOrbitalElementsInto, meanMotionRadPerDay } from '../physics/orbital.js';
import { RAD_TO_DEG } from '../physics/constants.js';

// Buffer de sortie partagé — réécrit par chaque appel `evaluateOrbitalElementsInto`.
// Zéro allocation runtime : ce littéral persiste entre les frames.
const _OUT = { x: 0, y: 0, z: 0, r: 0, trueAnomaly: 0 };

/**
 * Propage `meanAnomalyDeg` in-place — pas d'allocation.
 */
function advanceMeanAnomaly(orbital, deltaDays) {
  const n = meanMotionRadPerDay(orbital.semiMajorAxisAu);
  const deltaDeg = n * deltaDays * RAD_TO_DEG;
  let m = orbital.meanAnomalyDeg + deltaDeg;
  m = m % 360;
  if (m < 0) m += 360;
  orbital.meanAnomalyDeg = m;
}

/**
 * @param {import('three').InstancedMesh} mesh   Retour de createAsteroidBelt
 * @param {number} deltaDays                     Pas de temps simulé (jours terrestres)
 */
export function updateAsteroidBelt(mesh, deltaDays) {
  if (!mesh || !mesh.userData?.elements) return;
  if (!Number.isFinite(deltaDays) || deltaDays === 0) return;

  const elements = mesh.userData.elements;
  const M = mesh.userData.scratch.matrix; // Matrix4 réutilisé
  const count = elements.length;

  for (let i = 0; i < count; i++) {
    const orb = elements[i];
    advanceMeanAnomaly(orb, deltaDays);
    // Variante zéro-alloc — `_OUT` réutilisé, AUCUN littéral créé ici.
    evaluateOrbitalElementsInto(orb, _OUT);
    M.makeTranslation(_OUT.x, _OUT.y, _OUT.z);
    mesh.setMatrixAt(i, M);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
