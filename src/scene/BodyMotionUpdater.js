// BodyMotionUpdater — propage Kepler sur chaque corps du système et synchronise
// la position des nodes Three.js, frame par frame, ZÉRO allocation.
//
// Contrats consommés :
//   - data.bodies            : map normalisée { id → {orbital, parent, physical, type} }
//   - bodies (Map)           : { id → Group } retourné par SystemBuilder
//   - buffer                 : PlanetStateBuffer (positions héliocentriques persistées)
//   - timeService.clock      : SimulationClock (snapshot mutable réutilisé)
//
// NOTE convention frame (correction architecturale par rapport au brief) :
// `orbitalElementsToHeliocentric` est un solveur PUREMENT géométrique. Il
// applique Kepler + rotations Rz(-Ω)·Rx(-i)·Rz(-ω) aux 6 éléments fournis,
// dans le repère induit PAR CES ÉLÉMENTS. Les éléments de la Lune dans
// bodies.json sont GÉOCENTRIQUES (semi_major_axis_au = 0.00257 = distance
// Terre-Lune) ; le résultat est donc déjà dans le repère local Terre.
// Aucune soustraction de la position héliocentrique de la Terre n'est requise.
// Comme `moon` est parentée à `earth` dans le scene graph, on assigne
// directement le résultat à `node.position`.
//
// µ varie avec le parent : on choisit MU_SUN pour les héliocentriques et
// MU_EARTH pour les satellites (sinon période lunaire ridiculement courte).

import { orbitalElementsToHeliocentric } from '../physics/orbital.js';
import { HOURS_PER_DAY, MU_SUN_AU3_PER_DAY2, RAD_TO_DEG } from '../physics/constants.js';
import { satelliteOrbitDisplayScale } from './visualScale.js';

// µ_⊕ (AU³/jour²) — dérivé de GM_⊕ = 3.986004418e14 m³/s² normalisé en
// (UA, jour). Constante destinée à devenir export de constants.js si d'autres
// satellites apparaissent (LOT 5 : Phobos, Deimos, lunes galiléennes…).
const MU_EARTH_AU3_PER_DAY2 = 8.997011e-10;

function muForParent(parentId) {
  if (parentId === 'earth') return MU_EARTH_AU3_PER_DAY2;
  return MU_SUN_AU3_PER_DAY2;
}

/**
 * Avance M(t) in-place — pas d'allocation, contrairement à propagateMeanAnomaly()
 * qui retourne un littéral via spread.
 */
function advanceMeanAnomaly(orbital, deltaDays, mu) {
  const n = Math.sqrt(mu / (orbital.semiMajorAxisAu ** 3)); // rad/jour
  const dDeg = n * deltaDays * RAD_TO_DEG;
  let m = (orbital.meanAnomalyDeg + dDeg) % 360;
  if (m < 0) m += 360;
  orbital.meanAnomalyDeg = m;
}

/**
 * @param {{data: object, bodies: Map<string, import('three').Group>, buffer: import('./PlanetStateBuffer.js').PlanetStateBuffer, timeService: {clock: import('../time/SimulationClock.js').SimulationClock}}} deps
 * @returns {(dt:number, elapsed:number)=>void}  Compatible App.registerUpdater
 */
export function createBodyMotionUpdater({ data, bodies, buffer, timeService }) {
  if (!data?.bodies || !bodies || !buffer || !timeService?.clock) {
    throw new Error('createBodyMotionUpdater: dépendances manquantes');
  }

  // ---------------------------------------------------------------------------
  // Init : enregistrement des indices + écriture des positions J2000 initiales.
  // Toutes les allocations vivent ici, en dehors de la RAF.
  // ---------------------------------------------------------------------------
  const entries = []; // { id, node, orbital, mu, isLocal, mesh, rotationOmegaRadPerHour }
  for (const [id, body] of Object.entries(data.bodies)) {
    const node = bodies.get(id);
    if (!node) continue;

    const index = buffer.registerBody(id);

    let omegaPerHour = 0;
    if (body.physical?.rotationPeriodHours) {
      omegaPerHour = (2 * Math.PI) / body.physical.rotationPeriodHours;
    }

    if (body.orbital) {
      const mu = muForParent(body.parent);
      const isLocal = body.parent !== null && body.parent !== undefined;

      // Correction LOT 5 : exagération locale pour les satellites afin
      // qu'ils ne soient pas occultés par le mesh parent (cf. visualScale.js).
      let displayScale = 1;
      if (isLocal) {
        const parentNode = bodies.get(body.parent);
        const parentVisual = parentNode?.userData?.visualRadius ?? 0;
        const childVisual = node.userData?.visualRadius ?? 0;
        displayScale = satelliteOrbitDisplayScale(
          parentVisual, childVisual, body.orbital.semiMajorAxisAu,
        );
      }

      const p = orbitalElementsToHeliocentric(body.orbital);
      buffer.setPosition(index, p.x, p.y, p.z);
      node.position.set(p.x * displayScale, p.y * displayScale, p.z * displayScale);
      entries.push({
        id, node, orbital: body.orbital, mu, isLocal,
        mesh: node.userData?.mesh ?? null,
        omegaPerHour,
        index,
        displayScale,
        // LOT 5C — mémorisation de l'epoch (J2000) pour resetToEpoch().
        epochMeanAnomalyDeg: body.orbital.meanAnomalyDeg,
      });
    } else {
      // Sun : reste à l'origine, pas de propagation, mais peut tourner sur lui-même.
      buffer.setPosition(index, 0, 0, 0);
      entries.push({
        id, node, orbital: null, mu: 0, isLocal: false,
        mesh: node.userData?.mesh ?? null,
        omegaPerHour,
        index,
        displayScale: 1,
        epochMeanAnomalyDeg: 0,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Updater par-frame — Zéro allocation persistante.
  // Les littéraux {x,y,z,r,trueAnomaly} renvoyés par orbitalElementsToHeliocentric
  // sont gen-0 court-vivants (<100 corps) — tolérance documentée dans
  // asteroidBeltUpdater.js. Au-delà de 10 000 corps : variante out-buffer.
  // ---------------------------------------------------------------------------
  // LOT 5C — tickFn déclarée séparément pour pouvoir lui attacher resetToEpoch
  // via Object.assign. `app.registerUpdater(motionUpdater)` continue d'appeler
  // la fonction comme avant — Object.assign sur une fonction préserve sa
  // signature d'appel et permet de lui adjoindre des méthodes utilitaires.
  const tickFn = function tickBodyMotion(/* dt, elapsed */) {
    const snap = timeService.clock.getSnapshot(); // snapshot mutable réutilisé
    const dHours = snap.deltaHours;
    if (dHours === 0) return;
    const dDays = dHours / HOURS_PER_DAY;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];

      // 1) Translation orbitale
      if (e.orbital) {
        advanceMeanAnomaly(e.orbital, dDays, e.mu);
        const p = orbitalElementsToHeliocentric(e.orbital);
        // Mémoriser la position dans le buffer (lue par cameraFocus, eclipses, etc.).
        // Pour les corps héliocentriques c'est bien la position helio.
        // Pour la Lune (parent=earth) c'est la position relative à la Terre — on
        // utilise quand même un slot dédié : un futur consommateur intéressé par
        // la position helio de la Lune pourra l'additionner.
        buffer.setPosition(e.index, p.x, p.y, p.z);
        const s = e.displayScale;
        e.node.position.set(p.x * s, p.y * s, p.z * s);
      }

      // 2) Rotation propre — sur le mesh interne (pas sur axialTilt)
      if (e.mesh && e.omegaPerHour !== 0) {
        e.mesh.rotation.y += e.omegaPerHour * dHours;
      }
    }
  };

  /**
   * Replace les corps à leur position d'epoch (J2000). Aucune alloc.
   * Réinitialise meanAnomalyDeg ET réécrit la position héliocentrique courante
   * (sinon la première frame post-reset reste sur la dernière position propagée).
   */
  function resetToEpoch() {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.orbital) continue;
      e.orbital.meanAnomalyDeg = e.epochMeanAnomalyDeg;
      const p = orbitalElementsToHeliocentric(e.orbital);
      buffer.setPosition(e.index, p.x, p.y, p.z);
      const s = e.displayScale;
      e.node.position.set(p.x * s, p.y * s, p.z * s);
    }
  }

  return Object.assign(tickFn, { resetToEpoch });
}
