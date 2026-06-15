// LOT 16 R9 — Sanity check sur tous les SVG du glossaire.
// Régression "Nuage d'Oort" : la normalisation `(R - 14) / 22` partait d'un
// intervalle erroné, produisant `r` négatif et `opacity` > 1 → spam d'erreurs
// browser. Ce test parse le HTML statique de chaque template et vérifie qu'à
// l'état initial AUCUN <circle r="..."> n'est négatif et AUCUN opacity > 1.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderGlossarySvg } from '../src/ui/components/glossarySvgs.js';

const TERMS = [
  'orbit', 'planet', 'star', 'satellite', 'comet', 'asteroid', 'eclipse',
  'rotation', 'revolution', 'au', 'lightYear', 'parsec', 'kepler', 'orbitalIncl',
  'eccentricity', 'apogee', 'perigee', 'perihelion', 'aphelion', 'equinox',
  'solstice', 'tide', 'ecliptic', 'galaxy', 'nebula', 'redshift', 'blackHole',
  'pulsar', 'quasar', 'siderealYear', 'lunarPhase', 'meteorShower', 'magnitude',
  'asteroidBelt', 'kuiperBelt', 'binaryStar', 'occultation', 'oortCloud',
];

const ATTR = /(circle[^>]*\s)(r|opacity)="([^"]+)"/g;

function scanSvg(html) {
  const issues = [];
  let m;
  while ((m = ATTR.exec(html)) !== null) {
    const attr = m[2];
    const val = parseFloat(m[3]);
    if (attr === 'r' && val < 0) issues.push({ attr, val, snippet: m[0].slice(0, 60) });
    if (attr === 'opacity' && (val > 1 || val < 0)) {
      issues.push({ attr, val, snippet: m[0].slice(0, 60) });
    }
  }
  return issues;
}

for (const name of TERMS) {
  test(`glossarySvgs:${name} — pas de r<0 ni opacity hors [0..1]`, () => {
    const html = renderGlossarySvg(name);
    if (!html) return; // template absent toléré
    const issues = scanSvg(html);
    assert.deepEqual(issues, [], `Valeurs invalides dans ${name}: ${JSON.stringify(issues)}`);
  });
}
