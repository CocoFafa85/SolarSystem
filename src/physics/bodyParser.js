// Parseur PUR de bodies.json — extrait de bodyLoader.js pour usage navigateur.
// Aucun import Node ici : ce module se charge dans tout environnement ES.
// bodyLoader.js (Node) re-exporte ces fonctions et ajoute uniquement le wrapper fs.

const REQUIRED_PHYSICAL = [
  'mass', 'radius_au', 'rotation_period_hours', 'obliquity_degrees',
];
const REQUIRED_ORBITAL = [
  'semi_major_axis_au', 'eccentricity', 'inclination_degrees',
  'longitude_ascending_node_degrees', 'argument_perihelion_degrees',
  'mean_anomaly_epoch_degrees',
];

function assertFields(obj, fields, where) {
  for (const f of fields) {
    if (typeof obj[f] !== 'number' || !Number.isFinite(obj[f])) {
      throw new Error(`bodies.json: champ "${f}" manquant ou invalide dans ${where}`);
    }
  }
}

export function normalizeBody(id, raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`bodies.json: corps "${id}" invalide`);
  }
  assertFields(raw.physical, REQUIRED_PHYSICAL, `${id}.physical`);

  const physical = {
    massKg: raw.physical.mass,
    radiusAu: raw.physical.radius_au,
    rotationPeriodHours: raw.physical.rotation_period_hours,
    obliquityDeg: raw.physical.obliquity_degrees,
  };

  let orbital = null;
  if (raw.orbital !== null && raw.orbital !== undefined) {
    assertFields(raw.orbital, REQUIRED_ORBITAL, `${id}.orbital`);
    if (raw.orbital.eccentricity < 0 || raw.orbital.eccentricity >= 1) {
      throw new RangeError(`bodies.json: ${id}.orbital.eccentricity hors [0,1)`);
    }
    if (raw.orbital.semi_major_axis_au <= 0) {
      throw new RangeError(`bodies.json: ${id}.orbital.semi_major_axis_au <= 0`);
    }
    orbital = {
      semiMajorAxisAu: raw.orbital.semi_major_axis_au,
      eccentricity: raw.orbital.eccentricity,
      inclinationDeg: raw.orbital.inclination_degrees,
      longitudeAscendingNodeDeg: raw.orbital.longitude_ascending_node_degrees,
      argumentPerihelionDeg: raw.orbital.argument_perihelion_degrees,
      meanAnomalyDeg: raw.orbital.mean_anomaly_epoch_degrees,
    };
  }

  return {
    id,
    name: raw.name ?? id,
    type: raw.type ?? 'unknown',
    parent: raw.parent ?? null,
    physical,
    orbital,
  };
}

export function parseBodies(json) {
  if (!json || typeof json !== 'object' || !json.bodies) {
    throw new Error('bodies.json: structure racine invalide');
  }
  const result = {
    epoch: json.epoch ?? 'J2000.0',
    kmPerAu: json.constants?.KM_PER_AU,
    bodies: {},
  };
  for (const [id, raw] of Object.entries(json.bodies)) {
    result.bodies[id] = normalizeBody(id, raw);
  }
  return result;
}
