// densifyAsteroids — multiplicateur de cardinalité pour la ceinture.
// LOT 6 : passer de ~150 baseline à ~1500 (×10) sans modifier le contrat
// d'`asteroidBeltUpdater`. Chaque astéroïde réel sert de "graine" : on génère
// N-1 clones avec une perturbation déterministe sur M, ω et i pour disperser
// les positions sans biaiser la densité physique.
//
// ×100 (reporté) attend la dépendance Profile B : `evaluateOrbitalElementsInto`
// (variante out-buffer) — voir PLAN LOT 6 ligne 228.
//
// CONTRAT C : init-only, aucune utilisation runtime.

const SEED_MULT = 0x6D2B79F5; // mulberry32

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + SEED_MULT) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Génère `factor - 1` clones par astéroïde graine, avec micro-perturbation.
 * @param {Array<object>} seedAsteroids   Liste normalisée minorBodyParser
 * @param {number} factor                 multiplicateur ≥ 1 (1 = no-op)
 * @returns {Array<object>}               Liste étendue
 */
export function densifyAsteroids(seedAsteroids, factor = 10) {
  if (!Array.isArray(seedAsteroids) || factor <= 1) return seedAsteroids ?? [];
  const out = seedAsteroids.slice();
  const rng = makeRng(0xA51E101D);
  for (const seed of seedAsteroids) {
    for (let k = 1; k < factor; k++) {
      // Perturbations bornées :
      //   M : [0, 360)   — étalement angulaire complet sur l'orbite
      //   ω : ±10°       — décalage de périhélie modeste
      //   i : ±0.3°      — préserve le plan général
      const dM = rng() * 360;
      const dW = (rng() - 0.5) * 20;
      const dI = (rng() - 0.5) * 0.6;

      const orb = {
        semiMajorAxisAu: seed.orbital.semiMajorAxisAu,
        eccentricity: seed.orbital.eccentricity,
        inclinationDeg: Math.max(0, seed.orbital.inclinationDeg + dI),
        longitudeAscendingNodeDeg: seed.orbital.longitudeAscendingNodeDeg,
        argumentPerihelionDeg: (seed.orbital.argumentPerihelionDeg + dW + 360) % 360,
        meanAnomalyDeg: dM,
      };
      out.push({
        id: `${seed.id}_${k}`,
        name: `${seed.name ?? seed.id} #${k}`,
        type: 'asteroid',
        physical: seed.physical,
        orbital: orb,
      });
    }
  }
  return out;
}
