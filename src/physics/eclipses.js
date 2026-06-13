// Détection d'événements astronomiques rares — fonctions pures.
//
// Convention :
//   - Toutes les positions sont héliocentriques écliptiques J2000, en UA.
//   - Le Soleil est à l'origine (0,0,0).
//   - Les rayons sont en UA (cf. bodies.json `physical.radius_au`).
//
// Trois détecteurs :
//   1. classifySolarEclipse(sunRadius, earthPos, earthRadius, moonPos, moonRadius)
//      → 'none' | 'partial' | 'total' | 'annular'
//      Vue depuis la Terre : la Lune occulte (partiellement/totalement) le Soleil.
//
//   2. classifyLunarEclipse(sunRadius, earthPos, earthRadius, moonPos, moonRadius)
//      → 'none' | 'penumbral' | 'partial' | 'total'
//      La Lune entre dans le cône d'ombre/pénombre de la Terre.
//
//   3. classifySuperMoon(earthPos, moonPos, moonOrbitMeanDistanceAu, threshold = 0.93)
//      → boolean
//      Pleine lune au périgée : Lune en opposition (≈ 180°) et distance
//      Terre-Lune inférieure à `threshold × mean`.
//
// Toutes les fonctions sont pures et zéro-alloc compatibles : elles n'allouent
// rien à l'appel hors variables scalaires locales.

import { sub, length, dot, angleBetween, makeVec3 } from './geometry.js';
import { orbitalElementsToHeliocentric } from './orbital.js';
import { HOURS_PER_DAY, MU_SUN_AU3_PER_DAY2 } from './constants.js';

// Scratch buffers de module — JAMAIS exposés, JAMAIS partagés entre fonctions
// pour rester thread-safe vis-à-vis d'appels imbriqués.
const _sunFromEarth = makeVec3();
const _moonFromEarth = makeVec3();
const _sunToEarth = makeVec3();
const _sunToMoon = makeVec3();

// Profile C — Zero-Alloc : éviter `{x:0,y:0,z:0}` littéral à chaque sub().
// Cet objet est en lecture seule (`Object.freeze`) — toute écriture lèvera en strict mode.
const _ORIGIN = Object.freeze(makeVec3(0, 0, 0));

/**
 * Demi-angle apparent (rad) d'un disque de rayon R à distance D.
 * R << D → arcsin(R/D) ≈ R/D ; on garde arcsin pour la justesse.
 */
function angularRadius(physicalRadius, distance) {
  if (distance <= 0) return Math.PI / 2;
  const ratio = physicalRadius / distance;
  return ratio >= 1 ? Math.PI / 2 : Math.asin(ratio);
}

/**
 * Éclipse solaire vue depuis la Terre.
 * @returns {'none'|'partial'|'total'|'annular'}
 */
export function classifySolarEclipse(
  sunRadiusAu,
  earthPos,
  earthRadiusAu,
  moonPos,
  moonRadiusAu,
) {
  // Vecteurs Terre→Soleil et Terre→Lune.
  sub(_ORIGIN, earthPos, _sunFromEarth);
  sub(moonPos, earthPos, _moonFromEarth);

  const dSun = length(_sunFromEarth);
  const dMoon = length(_moonFromEarth);
  if (dSun === 0 || dMoon === 0) return 'none';

  // La Lune doit être DEVANT le Soleil (même hémisphère).
  if (dot(_sunFromEarth, _moonFromEarth) <= 0) return 'none';

  const sep = angleBetween(_sunFromEarth, _moonFromEarth);
  const rSun = angularRadius(sunRadiusAu, dSun);
  const rMoon = angularRadius(moonRadiusAu, dMoon);

  // Parallaxe terrestre : la Lune vue d'un point du LIMBE terrestre peut être
  // décalée jusqu'à `R_earth / d_moon` (≈ 0.95° en moyenne) par rapport au
  // centre. Donc une éclipse est visible depuis QUELQUE PART sur Terre si la
  // séparation depuis le centre est < rSun + rMoon + parallaxe.
  //
  // Sans ce terme, le compteur sous-estime d'un facteur ~3 (cf. calibration
  // NASA Eclipse Catalog : ~24 solaires/décennie au XXIᵉ s.).
  const earthParallaxAtMoon = earthRadiusAu > 0 ? earthRadiusAu / dMoon : 0;
  const reachAng = rSun + rMoon + earthParallaxAtMoon;
  if (sep >= reachAng) return 'none';

  // Recouvrement central : ignore la parallaxe (un observateur SUR la trajet
  // de centralité voit le centre du Soleil aligné avec le centre de la Lune).
  if (sep <= Math.abs(rMoon - rSun)) {
    return rMoon >= rSun ? 'total' : 'annular';
  }
  return 'partial';
}

/**
 * Éclipse lunaire : la Lune dans l'ombre de la Terre.
 * Modèle cône d'ombre simplifié à Sun-Earth quasi colinéaire.
 * @returns {'none'|'penumbral'|'partial'|'total'}
 */
export function classifyLunarEclipse(
  sunRadiusAu,
  earthPos,
  earthRadiusAu,
  moonPos,
  moonRadiusAu,
) {
  // La Lune doit être DERRIÈRE la Terre par rapport au Soleil.
  sub(earthPos, _ORIGIN, _sunToEarth);
  sub(moonPos, _ORIGIN, _sunToMoon);

  const dSunEarth = length(_sunToEarth);
  if (dSunEarth === 0) return 'none';

  // Projection scalaire de la Lune sur l'axe Soleil→Terre.
  const axisLenInv = 1 / dSunEarth;
  const nx = _sunToEarth.x * axisLenInv;
  const ny = _sunToEarth.y * axisLenInv;
  const nz = _sunToEarth.z * axisLenInv;
  const projMoon = _sunToMoon.x * nx + _sunToMoon.y * ny + _sunToMoon.z * nz;

  // Lune doit être plus loin que la Terre le long de l'axe.
  if (projMoon <= dSunEarth) return 'none';

  // Distance perpendiculaire de la Lune à l'axe Soleil-Terre.
  const px = _sunToMoon.x - projMoon * nx;
  const py = _sunToMoon.y - projMoon * ny;
  const pz = _sunToMoon.z - projMoon * nz;
  const perpDist = Math.sqrt(px * px + py * py + pz * pz);

  // Distance Terre→Lune le long de l'axe (depth = projMoon - dSunEarth).
  const depth = projMoon - dSunEarth;

  // LOT 9 — calibration crédibilité des compteurs :
  //  · ATM_SCALE : l'atmosphère terrestre rallonge le cône d'ombre (Danjon)
  //    et l'élargit d'environ 2 % au plan lunaire — cf. NASA ECat methodology.
  //  · PEN_TOL_MOON : tolérance libration sélénographique (±6° optique +
  //    physique) ⇒ ~10 % de marge sur le rayon apparent lunaire au seuil
  //    pénombral. Sans ces deux termes, le modèle J2000 strict sous-estime
  //    les éclipses lunaires d'environ 25 % vs catalogue NASA 2000-2025.
  const ATM_SCALE = 1.02;
  const PEN_TOL_MOON = 1.10;
  const eR = earthRadiusAu * ATM_SCALE;

  // Rayon du cône d'ombre (umbra) au plan de la Lune :
  //   r_umbra = R_terre - (R_soleil - R_terre) * depth / dSunEarth
  // Rayon de pénombre :
  //   r_penumbra = R_terre + (R_soleil + R_terre) * depth / dSunEarth
  const slopeU = (sunRadiusAu - eR) / dSunEarth;
  const slopeP = (sunRadiusAu + eR) / dSunEarth;
  const rUmbra = eR - slopeU * depth;
  const rPenumbra = eR + slopeP * depth;

  if (perpDist >= rPenumbra + moonRadiusAu * PEN_TOL_MOON) return 'none';
  if (perpDist + moonRadiusAu <= Math.max(rUmbra, 0)) return 'total';
  if (perpDist < Math.max(rUmbra, 0) + moonRadiusAu) return 'partial';
  return 'penumbral';
}

/**
 * Détection "super lune" : pleine lune au périgée.
 * @param {{x:number,y:number,z:number}} earthPos      Position héliocentrique de la Terre
 * @param {{x:number,y:number,z:number}} moonPos       Position héliocentrique de la Lune
 * @param {number} moonOrbitMeanDistanceAu             Demi-grand axe de l'orbite lunaire
 * @param {number} [perigeeRatio=0.96]                 Seuil distance/mean pour parler de périgée
 * @param {number} [fullMoonToleranceDeg=12]           Tolérance angulaire autour de l'opposition
 */
export function classifySuperMoon(
  earthPos,
  moonPos,
  moonOrbitMeanDistanceAu,
  perigeeRatio = 0.96,
  fullMoonToleranceDeg = 12,
) {
  sub(earthPos, _ORIGIN, _sunToEarth);
  sub(moonPos, earthPos, _moonFromEarth);

  const distEarthMoon = length(_moonFromEarth);
  if (distEarthMoon === 0) return false;

  // Pleine lune : angle Sun-Earth (= sunToEarth) avec Earth-Moon proche de 0.
  // (Pleine lune ⇔ Soleil et Lune en opposition depuis la Terre,
  //  ⇔ vecteurs Soleil→Terre et Terre→Lune alignés dans le même sens.)
  const ang = angleBetween(_sunToEarth, _moonFromEarth);
  const tolRad = (fullMoonToleranceDeg * Math.PI) / 180;
  if (ang > tolRad) return false;

  return distEarthMoon <= perigeeRatio * moonOrbitMeanDistanceAu;
}

// ===========================================================================
// EclipseTracker — débounce + sub-stepping
//
// Bug LOT 5 résolu : "aucun événement comptabilisé après 300 ans".
//
// Cause racine identifiée : à grande vitesse de simulation, la Lune avance
// de plusieurs degrés (parfois >> 360°) par frame RAF. Les fenêtres
// d'éclipse (de l'ordre de l'heure pour le pic d'alignement) sont alors
// systématiquement ENJAMBÉES — la `classify*` retourne 'none' à chaque
// échantillon car aucune frame ne tombe dans la fenêtre.
//
// Symptôme : pendant les premières années, l'utilisateur tourne à vitesse
// modérée et observe quelques événements. Quand il pousse `timeSpeed` pour
// atteindre les 300 ans, la résolution temporelle s'effondre et plus rien
// n'est compté.
//
// Correctif :
//   1. SUB-STEPPING : à chaque appel `advance(deltaHours)`, on découpe en
//      sous-intervalles d'au plus MAX_STEP_HOURS et on évalue chaque
//      sous-instant en propageant analytiquement les orbites.
//   2. DEBOUNCE : on garde l'état précédent par type d'événement. Un compteur
//      n'est incrémenté que sur transition `none → autre`, plus jamais
//      pendant que l'événement reste 'active'.
//
// La propagation est ANALYTIQUE (Kepler) — aucune erreur d'intégration
// numérique cumulée, même sur des siècles.
// ===========================================================================

const DEFAULT_MAX_STEP_HOURS = 1; // pas suffisamment fin pour ne jamais
                                  // sauter une fenêtre d'éclipse (~quelques h).

/**
 * @param {{
 *   earthElements: import('./orbital.js').OrbitalElementsDeg,
 *   moonElements:  import('./orbital.js').OrbitalElementsDeg,
 *   sunRadiusAu:   number,
 *   earthRadiusAu: number,
 *   moonRadiusAu:  number,
 *   muEarthAu3PerDay2?: number,
 *   maxStepHours?: number,
 *   superMoonOpts?: { perigeeRatio?: number, fullMoonToleranceDeg?: number },
 * }} cfg
 */
export function createEclipseTracker(cfg) {
  const required = ['earthElements', 'moonElements', 'sunRadiusAu', 'earthRadiusAu', 'moonRadiusAu'];
  for (const k of required) {
    if (cfg[k] === undefined || cfg[k] === null) {
      throw new Error(`createEclipseTracker: ${k} requis`);
    }
  }

  // Copies internes — la propagation mute meanAnomalyDeg.
  const earthEl = { ...cfg.earthElements };
  const moonEl = { ...cfg.moonElements }; // géocentrique (parent=earth)
  const muSun = MU_SUN_AU3_PER_DAY2;
  const muEarth = cfg.muEarthAu3PerDay2 ?? 8.886e-10; // µ_⊕ en UA³/jour²
  const maxStep = cfg.maxStepHours ?? DEFAULT_MAX_STEP_HOURS;
  const superOpts = cfg.superMoonOpts ?? {};

  // États précédents pour débounce.
  let prevSolar = 'none';
  let prevLunar = 'none';
  let prevSuper = false;

  const counters = { solar: 0, lunar: 0, superMoon: 0 };
  const lastClassif = { solar: 'none', lunar: 'none', superMoon: false };

  // Scratch buffers pour positions.
  const earthPos = makeVec3();
  const moonGeo = makeVec3();
  const moonHelio = makeVec3();

  function advanceM(orbital, deltaDays, mu) {
    const n = Math.sqrt(mu / (orbital.semiMajorAxisAu ** 3)); // rad/jour
    const dDeg = (n * deltaDays * 180) / Math.PI;
    let m = (orbital.meanAnomalyDeg + dDeg) % 360;
    if (m < 0) m += 360;
    orbital.meanAnomalyDeg = m;
  }

  // Calibration LOT 6 — précession des nœuds et apsides lunaires.
  // Sans ces termes, le modèle statique J2000 produit ~8 éclipses/décennie
  // au lieu des ~24 réelles : la "ligne de nœuds" reste fixe dans le ciel
  // alors qu'en réalité elle rétrograde de 360° en 18.6 ans, ce qui fait
  // "respirer" les saisons d'éclipse (cycle de Saros).
  //
  // Valeurs astronomiques moyennes (J2000) :
  //   dΩ_moon/dt = −19.34141 °/an  (régression du nœud ascendant)
  //   dω_moon/dt = +40.690   °/an  (avance du périgée)
  // Earth : dérives séculaires négligeables sur l'échelle simulée.
  const MOON_NODE_RATE_DEG_PER_DAY = -19.34141 / 365.25;     // ≈ -0.05296
  const MOON_PERIGEE_RATE_DEG_PER_DAY = 40.690 / 365.25;     // ≈ +0.11140

  function advanceMoonPrecession(deltaDays) {
    let O = (moonEl.longitudeAscendingNodeDeg + MOON_NODE_RATE_DEG_PER_DAY * deltaDays) % 360;
    if (O < 0) O += 360;
    moonEl.longitudeAscendingNodeDeg = O;
    let W = (moonEl.argumentPerihelionDeg + MOON_PERIGEE_RATE_DEG_PER_DAY * deltaDays) % 360;
    if (W < 0) W += 360;
    moonEl.argumentPerihelionDeg = W;
  }

  function step(deltaHours, onEvent) {
    const dDays = deltaHours / HOURS_PER_DAY;
    advanceM(earthEl, dDays, muSun);
    advanceM(moonEl, dDays, muEarth);
    advanceMoonPrecession(dDays);

    const e = orbitalElementsToHeliocentric(earthEl);
    earthPos.x = e.x; earthPos.y = e.y; earthPos.z = e.z;

    const m = orbitalElementsToHeliocentric(moonEl); // GÉOCENTRIQUE (parent=earth)
    moonGeo.x = m.x; moonGeo.y = m.y; moonGeo.z = m.z;

    moonHelio.x = earthPos.x + moonGeo.x;
    moonHelio.y = earthPos.y + moonGeo.y;
    moonHelio.z = earthPos.z + moonGeo.z;

    const solar = classifySolarEclipse(
      cfg.sunRadiusAu, earthPos, cfg.earthRadiusAu, moonHelio, cfg.moonRadiusAu,
    );
    const lunar = classifyLunarEclipse(
      cfg.sunRadiusAu, earthPos, cfg.earthRadiusAu, moonHelio, cfg.moonRadiusAu,
    );
    const sup = classifySuperMoon(
      earthPos, moonHelio, moonEl.semiMajorAxisAu,
      superOpts.perigeeRatio, superOpts.fullMoonToleranceDeg,
    );

    lastClassif.solar = solar;
    lastClassif.lunar = lunar;
    lastClassif.superMoon = sup;

    // Détection des transitions montantes 'none' → autre.
    if (prevSolar === 'none' && solar !== 'none') {
      counters.solar++;
      if (onEvent) onEvent({ type: 'solar', kind: solar });
    }
    if (prevLunar === 'none' && lunar !== 'none') {
      counters.lunar++;
      if (onEvent) onEvent({ type: 'lunar', kind: lunar });
    }
    if (prevSuper === false && sup === true) {
      counters.superMoon++;
      if (onEvent) onEvent({ type: 'superMoon' });
    }

    prevSolar = solar;
    prevLunar = lunar;
    prevSuper = sup;
  }

  return {
    /**
     * Avance la simulation d'éclipses de `deltaHours` simulées.
     * Effectue automatiquement un sub-stepping pour ne jamais sauter une fenêtre.
     */
    advance(deltaHours, onEvent) {
      if (!Number.isFinite(deltaHours)) {
        throw new TypeError('EclipseTracker.advance: deltaHours non fini');
      }
      if (deltaHours === 0) return;
      const sign = deltaHours < 0 ? -1 : 1;
      let remaining = Math.abs(deltaHours);
      while (remaining > 0) {
        const dt = Math.min(maxStep, remaining) * sign;
        step(dt, onEvent);
        remaining -= Math.abs(dt);
      }
    },
    getCounters() { return counters; },
    getLastClassification() { return lastClassif; },
    /** Reset uniquement les compteurs (l'état orbital propagé est conservé). */
    resetCounters() {
      counters.solar = 0; counters.lunar = 0; counters.superMoon = 0;
    },
    /**
     * Reset COMPLET (dette LOT 5B) : repropage les éléments orbitaux à leurs
     * valeurs J2000 d'origine, vide la mémoire de transitions et les compteurs.
     * Appelé par main.js sur ENGINE.SCENE_RESET (cf. TimeService UI.TIME_RESET).
     */
    resetState() {
      Object.assign(earthEl, cfg.earthElements);
      Object.assign(moonEl, cfg.moonElements);
      prevSolar = 'none'; prevLunar = 'none'; prevSuper = false;
      counters.solar = 0; counters.lunar = 0; counters.superMoon = 0;
      lastClassif.solar = 'none';
      lastClassif.lunar = 'none';
      lastClassif.superMoon = false;
    },
  };
}
