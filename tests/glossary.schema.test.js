// LOT 8C — Validation du schéma `animation` du glossaire FR.
// Pattern AAA. Source de vérité : src/data/glossaryDataFr.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import glossary, {
  SCENE_MARKER_IDS,
  SCENE_PRESET_IDS,
  OVERLAY_SVG_KEYS,
} from '../src/data/glossaryDataFr.js';
import { hasGlossarySvg } from '../src/ui/components/glossarySvgs.js';

const KNOWN_BODY_IDS = new Set([
  'sun', 'moon',
  'mercury', 'venus', 'earth', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune',
  'pluto',
  'halley', 'encke', 'neowise',
  'ceres', 'vesta', 'pallas',
]);
const KNOWN_MARKER_IDS = new Set(SCENE_MARKER_IDS);
const KNOWN_PRESET_IDS = new Set(SCENE_PRESET_IDS);
const KNOWN_SCENE_TARGETS = new Set([
  ...KNOWN_BODY_IDS, ...KNOWN_MARKER_IDS, ...KNOWN_PRESET_IDS,
]);
const KNOWN_SVG_KEYS = new Set(OVERLAY_SVG_KEYS);

test('glossary: structure de base', () => {
  // Arrange / Act
  const { terms } = glossary;
  // Assert
  assert.ok(Array.isArray(terms), 'terms doit être un tableau');
  assert.ok(terms.length >= 30, `attendu ≥ 30 termes, reçu ${terms.length}`);
});

test('glossary: ids uniques + champs obligatoires non vides', () => {
  const { terms } = glossary;
  const seen = new Set();
  for (const t of terms) {
    assert.equal(typeof t.id, 'string', `id manquant : ${JSON.stringify(t)}`);
    assert.ok(t.id.length > 0, 'id vide');
    assert.ok(!seen.has(t.id), `id dupliqué : ${t.id}`);
    seen.add(t.id);
    assert.equal(typeof t.term, 'string', `term manquant : ${t.id}`);
    assert.ok(t.term.length > 0, `term vide : ${t.id}`);
    assert.equal(typeof t.def, 'string', `def manquante : ${t.id}`);
    assert.ok(t.def.length > 10, `def trop courte : ${t.id}`);
  }
});

test('glossary: schéma animation 100 % overlay (LOT 10 — sceneCamera abandonné)', () => {
  const { terms } = glossary;
  for (const t of terms) {
    const a = t.animation;
    assert.notEqual(a, null, `animation null interdite : ${t.id}`);
    assert.equal(typeof a, 'object', `animation doit être objet : ${t.id}`);
    assert.equal(a.kind, 'overlay', `kind doit être 'overlay' (LOT 10) : ${t.id} → ${a.kind}`);
    assert.equal(typeof a.svg, 'string', `overlay.svg manquant : ${t.id}`);
    assert.ok(KNOWN_SVG_KEYS.has(a.svg), `overlay.svg inconnu (${a.svg}) pour ${t.id}`);
    assert.ok(hasGlossarySvg(a.svg), `overlay.svg absent de LIB : ${a.svg} (${t.id})`);
  }
  // Garde-fou anti-régression : aucune référence sceneCamera ne doit subsister.
  for (const t of terms) {
    assert.notEqual(t.animation?.kind, 'sceneCamera', `sceneCamera interdit (LOT 10) : ${t.id}`);
  }
  // KNOWN_SCENE_TARGETS conservé exporté pour rétro-compat ; consommé ici
  // uniquement pour éviter un warning "import inutilisé" du linter.
  assert.ok(KNOWN_SCENE_TARGETS.size > 0);
});

test('glossary: couverture des termes clés explicitement animés', () => {
  // Brief PLAN.md LOT 8C : orbite, ecliptique, equinoxe, solstice, eclipse,
  // peripheliaphelie (=> perihelion+aphelion), obliquite, keplerLois (=> orbit).
  const { terms } = glossary;
  const byId = new Map(terms.map((t) => [t.id, t]));
  const required = ['orbit', 'ecliptic', 'equinox', 'solstice', 'eclipse',
                    'perihelion', 'aphelion', 'obliquity'];
  for (const id of required) {
    const t = byId.get(id);
    assert.ok(t, `terme requis absent : ${id}`);
    assert.ok(t.animation !== undefined, `animation absente pour ${id} (utiliser null explicite)`);
    assert.notEqual(t.animation, null, `animation devrait être renseignée pour ${id}`);
  }
});

test('glossary: tous les termes ont une animation définie (null explicite OK)', () => {
  const { terms } = glossary;
  for (const t of terms) {
    assert.ok('animation' in t, `clé animation manquante : ${t.id}`);
  }
});
