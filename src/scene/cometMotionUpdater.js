// cometMotionUpdater — propage Kepler sur les comètes (et tout corps "individuel"
// non-planète : top-3 astéroïdes promus en LOT 5D).
//
// Pattern strictement identique à BodyMotionUpdater :
//   - état orbital muté in-place (zéro alloc),
//   - position cartésienne réécrite sur le Group root du corps,
//   - resetToEpoch via Float-mémo `epochMeanAnomalyDeg`.
//
// CONTRAT C #1 :
//   - boucle `for (let i …)` indexée,
//   - 1 littéral {x,y,z,r,trueAnomaly} par corps × cardinalité ≤ ~8,
//   - aucun `new` runtime, aucune Map/Array recréée par tick.

import {
  orbitalElementsToHeliocentric,
  meanMotionRadPerDay,
} from '../physics/orbital.js';
import {
  HOURS_PER_DAY,
  RAD_TO_DEG,
} from '../physics/constants.js';

/** Avance M(t) in-place — pas d'allocation. */
function advance(orb, dDays) {
  const n = meanMotionRadPerDay(orb.semiMajorAxisAu);
  const dDeg = n * dDays * RAD_TO_DEG;
  let m = (orb.meanAnomalyDeg + dDeg) % 360;
  if (m < 0) m += 360;
  orb.meanAnomalyDeg = m;
}

/**
 * @param {{ comets: Map<string, { root: import('three').Group, orbital: object }>, timeService: { clock: { getSnapshot: () => any } } }} deps
 */
export function createCometMotionUpdater({ comets, timeService }) {
  if (!comets || !timeService?.clock) {
    throw new Error('createCometMotionUpdater: dépendances manquantes');
  }

  // Init : extraction des entries en tableau plat indexable et écriture des
  // positions J2000. La Map n'est plus relue après cette passe.
  const entries = [];
  for (const [, entry] of comets) {
    if (!entry?.root || !entry?.orbital) continue;
    const orb = entry.orbital;
    entries.push({
      group: entry.root,
      orbital: orb,
      epochMeanAnomalyDeg: orb.meanAnomalyDeg,
    });
    const p = orbitalElementsToHeliocentric(orb);
    entry.root.position.set(p.x, p.y, p.z);
  }

  function tick() {
    const snap = timeService.clock.getSnapshot();
    if (snap.deltaHours === 0) return;
    const dDays = snap.deltaHours / HOURS_PER_DAY;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      advance(e.orbital, dDays);
      const p = orbitalElementsToHeliocentric(e.orbital);
      e.group.position.set(p.x, p.y, p.z);
    }
  }

  function reset() {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      e.orbital.meanAnomalyDeg = e.epochMeanAnomalyDeg;
      const p = orbitalElementsToHeliocentric(e.orbital);
      e.group.position.set(p.x, p.y, p.z);
    }
  }

  return { tick, reset };
}
