// View-model des corps célestes — fusionne `bodies.json` (physique J2000)
// avec `data/bodies-display.json` (enrichissements UI).
// L'UI n'utilise QUE ce module. Tolère l'absence d'un corps dans bodies.json
// (cas typique : comètes / astéroïdes vivent dans les loaders dédiés).
//
// LOT 5C — Exception SoC contrôlée : on importe le CATALOGUE des comètes
// (data normalisée pure, pas de Three.js, pas de DOM) afin d'alimenter
// groups.minor pour le BodyMenu. Aucun comportement physique n'est invoqué ;
// on se contente d'extraire {id, name, orbital, physical} → VM d'affichage.

import { getComets } from '../../data/cometsCatalog.js';

const BODIES_URL  = 'bodies.json';
const DISPLAY_URL = 'data/bodies-display.json';

let _cache = null;
let _inflight = null;

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`[bodyView] HTTP ${res.status} sur ${url}`);
  return res.json();
}

function siderealPeriodHours(aAu) {
  if (!Number.isFinite(aAu) || aAu <= 0) return 0;
  const years = Math.sqrt(aAu * aAu * aAu);
  return years * 8760;
}

function buildVm(id, body, display) {
  const phys = body?.physical || {};
  const orb  = body?.orbital  || null;
  const d    = display || {};
  const name = body?.name || d.name || id;

  return {
    id,
    name,
    type: body?.type || d.category || 'unknown',
    category: d.category || body?.type || 'unknown',
    parent: body?.parent || null,
    accent: d.accent || '#ffffff',
    descKey: d.descKey || null,
    badgeKey: d.badgeKey || null,
    physical: {
      massKg: phys.mass,
      radiusAu: phys.radius_au,
      radiusKm: Number.isFinite(phys.radius_au) ? phys.radius_au * 149597870.7 : NaN,
      rotationPeriodHours: phys.rotation_period_hours,
      retrogradeRotation: phys.rotation_period_hours < 0,
      obliquityDeg: phys.obliquity_degrees,
    },
    orbital: orb ? {
      semiMajorAxisAu: orb.semi_major_axis_au,
      eccentricity: orb.eccentricity,
      inclinationDeg: orb.inclination_degrees,
      orbitalPeriodHours: siderealPeriodHours(orb.semi_major_axis_au),
    } : null,
    derived: {
      orbitalSpeedKmS: d.orbitalSpeedKmS ?? null,
      tempMinK: d.tempMinK ?? null,
      tempMaxK: d.tempMaxK ?? null,
    },
  };
}

export async function loadBodyViews() {
  if (_cache) return _cache;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    const [rawBodies, rawDisplay] = await Promise.all([
      fetchJson(BODIES_URL),
      fetchJson(DISPLAY_URL),
    ]);

    const list = [];
    const byId = Object.create(null);
    const groups = { planets: [], dwarfs: [], minor: [] };

    const order = rawDisplay.order || Object.keys(rawDisplay.bodies || {});
    const extra = Object.keys(rawDisplay.bodies || {}).filter((k) => !order.includes(k));
    const fullOrder = [...order, ...extra];

    for (const id of fullOrder) {
      const body = rawBodies.bodies?.[id];      // peut être undefined
      const disp = rawDisplay.bodies?.[id];
      if (!body && !disp) continue;
      const vm = buildVm(id, body, disp);
      list.push(vm);
      byId[id] = vm;
    }

    // --- Comètes du catalogue durci (LOT 5C) ------------------------------
    // On les fusionne en VMs et on les pousse dans groups.minor. Astéroïdes
    // skipés volontairement (InstancedMesh non-focusable individuellement).
    const COMET_ACCENT_DEFAULT = '#6a8fbf';
    try {
      const comets = getComets();
      for (const c of comets) {
        // Schéma minorBodyParser : { id, name, type:'comet', physical, orbital }
        const dispOverride = rawDisplay.bodies?.[c.id] || null;
        const synthDisp = dispOverride || {
          accent: COMET_ACCENT_DEFAULT,
          category: 'comet',
          orbitalSpeedKmS: null, tempMinK: null, tempMaxK: null,
          descKey: `bodies.${c.id}.desc`,
        };
        const vm = buildVm(c.id, c, synthDisp);
        // Pas d'écrasement si déjà chargé via bodies.json (futur Pluton)
        if (!byId[c.id]) {
          list.push(vm);
          byId[c.id] = vm;
        }
      }
    } catch (err) {
      console.warn('[bodyView] échec chargement comètes', err);
    }

    // Groupes d'affichage (utilisés par BodyMenu accordéons). LOT 6 : 3 sections.
    (rawDisplay.groups?.planets || []).forEach((id) => byId[id] && groups.planets.push(byId[id]));
    (rawDisplay.groups?.dwarfs  || []).forEach((id) => byId[id] && groups.dwarfs.push(byId[id]));

    // Section "minor" : comètes du catalogue (ordre stable) + entrées display
    // explicites (Vesta/Pallas). Déduplication par id.
    const minorIds = new Set();
    try {
      for (const c of getComets()) {
        if (byId[c.id] && !minorIds.has(c.id)) { groups.minor.push(byId[c.id]); minorIds.add(c.id); }
      }
    } catch { /* déjà loggé plus haut */ }
    (rawDisplay.groups?.minor || []).forEach((id) => {
      if (byId[id] && !minorIds.has(id)) { groups.minor.push(byId[id]); minorIds.add(id); }
    });

    _cache = { list, byId, groups };
    _inflight = null;
    return _cache;
  })();

  return _inflight;
}

/* --- Formatters ---------------------------------------------------------- */

export function formatMass(kg) {
  if (!Number.isFinite(kg)) return '—';
  const exp = Math.floor(Math.log10(kg));
  const mantissa = kg / Math.pow(10, exp);
  return `${mantissa.toFixed(2)}·10^${exp} kg`;
}

export function formatRadiusKm(km) {
  if (!Number.isFinite(km)) return '—';
  return `${km.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km`;
}

export function formatRotationPeriod(hours) {
  if (!Number.isFinite(hours)) return '—';
  const abs = Math.abs(hours);
  const sign = hours < 0 ? '↺ ' : '';
  if (abs < 48) return `${sign}${abs.toFixed(2)} h`;
  return `${sign}${(abs / 24).toFixed(1)} j`;
}

export function formatOrbitalPeriod(hours) {
  if (!Number.isFinite(hours) || hours === 0) return '—';
  const years = hours / 8760;
  if (years < 1) return `${(hours / 24).toFixed(1)} j`;
  return `${years.toFixed(2)} a`;
}

export function formatKmS(v) {
  if (!Number.isFinite(v) || v === 0) return '—';
  return `${v.toFixed(2)} km/s`;
}

export function formatTempK(k) {
  if (!Number.isFinite(k)) return '—';
  const c = k - 273.15;
  return `${k.toLocaleString('fr-FR')} K (${c.toFixed(0)} °C)`;
}

export function formatTempRange(minK, maxK) {
  if (!Number.isFinite(minK) || !Number.isFinite(maxK) || (minK === 0 && maxK === 0)) return '—';
  if (minK === maxK) return formatTempK(minK);
  return `${formatTempK(minK)} → ${formatTempK(maxK)}`;
}

export function sortByMetric(list, metric) {
  const getValue = {
    mass:           (v) => v.physical.massKg,
    size:           (v) => v.physical.radiusKm,
    temp:           (v) => v.derived.tempMaxK,
    orbitalSpeed:   (v) => v.derived.orbitalSpeedKmS,
    rotationSpeed:  (v) => 1 / Math.abs(v.physical.rotationPeriodHours),
  }[metric];
  if (!getValue) return list.slice();
  return list.slice().sort((a, b) => (getValue(b) ?? -Infinity) - (getValue(a) ?? -Infinity));
}

export function metricValue(vm, metric) {
  switch (metric) {
    case 'mass':          return formatMass(vm.physical.massKg);
    case 'size':          return formatRadiusKm(vm.physical.radiusKm);
    case 'temp':          return formatTempRange(vm.derived.tempMinK, vm.derived.tempMaxK);
    case 'orbitalSpeed':  return formatKmS(vm.derived.orbitalSpeedKmS);
    case 'rotationSpeed': return formatRotationPeriod(vm.physical.rotationPeriodHours);
    default: return '—';
  }
}

/* --- Conversion temps simulé → date civile (LOT 5) -----------------------
 * Profile B fournira un adaptateur officiel ; en attendant on offre un
 * fallback purement UI qui prend `simEpochISO` du moteur (ou une constante
 * par défaut) et ajoute `elapsedHours` au timestamp.
 * ----------------------------------------------------------------------- */
export const DEFAULT_SIM_EPOCH_ISO = '2000-01-01T12:00:00Z'; // J2000.0

export function elapsedHoursToCivilDate(elapsedHours, epochISO = DEFAULT_SIM_EPOCH_ISO) {
  const epochMs = Date.parse(epochISO);
  if (!Number.isFinite(epochMs) || !Number.isFinite(elapsedHours)) return null;
  return new Date(epochMs + elapsedHours * 3_600_000);
}

const _yearFmt = new Intl.DateTimeFormat('fr-FR', { year: 'numeric' });
const _fullFmt = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: '2-digit' });

export function formatCivilYear(date) { return date ? _yearFmt.format(date) : '—'; }
export function formatCivilDate(date) { return date ? _fullFmt.format(date) : '—'; }
