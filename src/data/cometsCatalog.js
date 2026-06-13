// Catalogue durci des comètes périodiques de référence.
// Source : JPL Small-Body Database, époque J2000.0. Excentricités ∈ [0.84, 0.995] —
// orbites fortement excentriques, requis fonctionnel LOT 4.
//
// Schéma identique à bodyParser.normalizeBody pour passage direct dans les
// modules de scène existants (createOrbitLine, orbitalElementsToHeliocentric).

import { normalizeMinorBody } from '../physics/minorBodyParser.js';

const RAW_COMETS = Object.freeze({
  halley: {
    name: '1P/Halley',
    type: 'comet',
    physical: { mass: null, radius_au: 3.7e-8, rotation_period_hours: null, obliquity_degrees: 0 },
    orbital: {
      semi_major_axis_au: 17.834,
      eccentricity: 0.96714,
      inclination_degrees: 162.26,
      longitude_ascending_node_degrees: 58.42,
      argument_perihelion_degrees: 111.33,
      mean_anomaly_epoch_degrees: 38.38,
    },
  },
  encke: {
    name: 'Encke',
    type: 'comet',
    physical: { mass: null, radius_au: 1.6e-8, rotation_period_hours: null, obliquity_degrees: 0 },
    orbital: {
      semi_major_axis_au: 2.2153,
      eccentricity: 0.84819,
      inclination_degrees: 11.78,
      longitude_ascending_node_degrees: 334.57,
      argument_perihelion_degrees: 186.55,
      mean_anomaly_epoch_degrees: 0.0,
    },
  },
  tempelTuttle: {
    name: 'Tempel-Tuttle',
    type: 'comet',
    physical: { mass: null, radius_au: 1.2e-8, rotation_period_hours: null, obliquity_degrees: 0 },
    orbital: {
      semi_major_axis_au: 10.337,
      eccentricity: 0.90555,
      inclination_degrees: 162.49,
      longitude_ascending_node_degrees: 235.27,
      argument_perihelion_degrees: 172.50,
      mean_anomaly_epoch_degrees: 12.0,
    },
  },
  borrelly: {
    name: 'Borrelly',
    type: 'comet',
    physical: { mass: null, radius_au: 1.7e-8, rotation_period_hours: null, obliquity_degrees: 0 },
    orbital: {
      semi_major_axis_au: 3.6094,
      eccentricity: 0.62390,
      inclination_degrees: 30.32,
      longitude_ascending_node_degrees: 75.42,
      argument_perihelion_degrees: 351.95,
      mean_anomaly_epoch_degrees: 200.0,
    },
  },
  haleBopp: {
    name: 'Hale-Bopp',
    type: 'comet',
    physical: { mass: null, radius_au: 2.0e-7, rotation_period_hours: null, obliquity_degrees: 0 },
    orbital: {
      semi_major_axis_au: 186.0,
      eccentricity: 0.995086,
      inclination_degrees: 89.43,
      longitude_ascending_node_degrees: 282.47,
      argument_perihelion_degrees: 130.59,
      mean_anomaly_epoch_degrees: 0.05,
    },
  },
  // LOT 8 — Neowise (C/2020 F3). Éléments orbitaux JPL SBDB.
  // a ≈ 358 UA, e ≈ 0.99918, période ≈ 6766 ans. Périhélie 0.295 UA.
  neowise: {
    name: 'Neowise',
    type: 'comet',
    physical: { mass: null, radius_au: 3.3e-8, rotation_period_hours: null, obliquity_degrees: 0 },
    orbital: {
      semi_major_axis_au: 358.0,
      eccentricity: 0.99918,
      inclination_degrees: 128.93,
      longitude_ascending_node_degrees: 61.01,
      argument_perihelion_degrees: 37.28,
      mean_anomaly_epoch_degrees: 0.01,
    },
  },
});

// LOT 8 — comètes équipées d'une queue ionique (plasma bleu rectiligne en plus
// du dust courbe). Lue par main.js / CometSystem pour activer la 2ᵉ queue.
export const ION_TRAIL_COMETS = Object.freeze(new Set(['haleBopp', 'neowise']));

/** Liste normalisée prête à consommer (orbitalElementsToHeliocentric / createOrbitLine). */
export function getComets() {
  return Object.entries(RAW_COMETS).map(([id, raw]) => normalizeMinorBody(id, raw));
}
