// Parseur PERMISSIF pour les corps mineurs (astéroïdes, comètes).
// Diffère de bodyParser :
//   - structure racine = flat map (pas de wrapper `bodies`),
//   - champs physiques nullables (mass, rotation_period_hours souvent absents),
//   - excentricité jusqu'à 0.999 admise (comètes hyperboliques-limite exclues : e ≥ 1).

const REQUIRED_ORBITAL = [
  'semi_major_axis_au', 'eccentricity', 'inclination_degrees',
  'longitude_ascending_node_degrees', 'argument_perihelion_degrees',
  'mean_anomaly_epoch_degrees',
];

function assertOrbital(orb, id) {
  for (const f of REQUIRED_ORBITAL) {
    if (typeof orb[f] !== 'number' || !Number.isFinite(orb[f])) {
      throw new Error(`minorBody "${id}": orbital.${f} invalide`);
    }
  }
  if (orb.eccentricity < 0 || orb.eccentricity >= 1) {
    throw new RangeError(`minorBody "${id}": eccentricity hors [0,1)`);
  }
  if (orb.semi_major_axis_au <= 0) {
    throw new RangeError(`minorBody "${id}": semi_major_axis_au <= 0`);
  }
}

function normalizeNullable(value) {
  return (typeof value === 'number' && Number.isFinite(value)) ? value : null;
}

export function normalizeMinorBody(id, raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`minorBody "${id}": entrée invalide`);
  }
  if (!raw.orbital) throw new Error(`minorBody "${id}": orbital manquant`);
  assertOrbital(raw.orbital, id);

  return {
    id,
    name: raw.name ?? id,
    type: raw.type ?? 'asteroid',
    discoveredYear: raw.discoveredYear ?? null,
    physical: {
      massKg: normalizeNullable(raw.physical?.mass),
      radiusAu: normalizeNullable(raw.physical?.radius_au),
      rotationPeriodHours: normalizeNullable(raw.physical?.rotation_period_hours),
      obliquityDeg: normalizeNullable(raw.physical?.obliquity_degrees) ?? 0,
    },
    orbital: {
      semiMajorAxisAu: raw.orbital.semi_major_axis_au,
      eccentricity: raw.orbital.eccentricity,
      inclinationDeg: raw.orbital.inclination_degrees,
      longitudeAscendingNodeDeg: raw.orbital.longitude_ascending_node_degrees,
      argumentPerihelionDeg: raw.orbital.argument_perihelion_degrees,
      meanAnomalyDeg: raw.orbital.mean_anomaly_epoch_degrees,
    },
  };
}

/** @param {Record<string, object>} flatMap  Structure racine d'asteroids.json */
export function parseMinorBodies(flatMap) {
  if (!flatMap || typeof flatMap !== 'object') {
    throw new Error('parseMinorBodies: objet racine invalide');
  }
  const out = [];
  for (const [id, raw] of Object.entries(flatMap)) {
    try { out.push(normalizeMinorBody(id, raw)); }
    catch (err) { console.warn('[minorBodyParser] skip', id, err.message); }
  }
  return out;
}
