// LOT 16 #10 — VM propage discoveredYear et dwarfClassifiedYear.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeMinorBody } from '../src/physics/minorBodyParser.js';

// On accède au buildVm indirectement : la fonction est interne. Pour tester
// la propagation depuis le display, on duplique la portion minimale (les
// champs concernés) via un assemblage manuel ; sinon on couvre via comètes
// catalogue qui transitent par normalizeMinorBody.

test('normalizeMinorBody propage discoveredYear', () => {
  const c = normalizeMinorBody('halley', {
    name: '1P/Halley',
    type: 'comet',
    discoveredYear: 1758,
    orbital: {
      semi_major_axis_au: 17.834,
      eccentricity: 0.96714,
      inclination_degrees: 162.26,
      longitude_ascending_node_degrees: 58.42,
      argument_perihelion_degrees: 111.33,
      mean_anomaly_epoch_degrees: 38.38,
    },
  });
  assert.equal(c.discoveredYear, 1758);
});

test('normalizeMinorBody — discoveredYear absent → null', () => {
  const c = normalizeMinorBody('x', {
    name: 'x', type: 'comet',
    orbital: {
      semi_major_axis_au: 1, eccentricity: 0.5, inclination_degrees: 0,
      longitude_ascending_node_degrees: 0, argument_perihelion_degrees: 0,
      mean_anomaly_epoch_degrees: 0,
    },
  });
  assert.equal(c.discoveredYear, null);
});
