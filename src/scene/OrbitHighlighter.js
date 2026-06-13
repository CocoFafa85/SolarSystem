import { UI } from '../ui/core/channels.js';

// LOT 9 — surbrillance d'une orbite au survol BodyMenu.
//
// Sémantique (spec utilisateur) : survol = orbite brille, AUCUN mouvement
// caméra. Distinct de :
//   - UI.VIEW_HOVER  (preview caméra — glossaire LOT 8C)
//   - UI.ORBIT_HOVER (raycaster sur les anchors — LOT 7/8D)
//
// Implémentation :
//   - Index `id → Line` construit à l'init en parcourant les Groups passés
//     en paramètre (les Lines portent `userData.bodyId` depuis le LOT 8B,
//     et les orbites de comètes via CometSystem.js).
//   - 1 listener bus, 1 ref Line courante + couleur précédente sauvegardée
//     dans 3 scalaires module-scope. Zéro alloc par hover.
//   - Sur changement, restaure la Line précédente avant d'activer la nouvelle.
//
// Note rendu : `linewidth` n'est pas honoré par WebGLRenderer (toujours 1 px)
// → on agit sur `material.color` + `material.opacity` (les LineMaterials du
// projet utilisent `transparent: true` + `opacity < 1`, cf. createOrbitLine).

const HIGHLIGHT_COLOR_HEX = 0xffffff;
const HIGHLIGHT_OPACITY   = 1.0;

export function createOrbitHighlighter({ bus, groups }) {
  // Map id → { line, mat, savedColorHex, savedOpacity }
  const index = new Map();

  for (const root of groups) {
    if (!root) continue;
    root.traverse((node) => {
      const id = node?.userData?.bodyId;
      if (!id) return;
      if (!node.material) return;
      // Stocke l'état initial UNE fois (la Line est statique : couleur + opacité
      // ne sont pas mutées ailleurs en RAF).
      index.set(id, {
        line: node,
        mat: node.material,
        savedColorHex: node.material.color ? node.material.color.getHex() : null,
        savedOpacity:  typeof node.material.opacity === 'number' ? node.material.opacity : 1.0,
      });
    });
  }

  // État courant (1 référence — pas d'allocation).
  let currentEntry = null;

  function restoreCurrent() {
    if (!currentEntry) return;
    const { mat, savedColorHex, savedOpacity } = currentEntry;
    if (mat.color && savedColorHex !== null) mat.color.setHex(savedColorHex);
    mat.opacity = savedOpacity;
    mat.needsUpdate = true;
    currentEntry = null;
  }

  function applyHighlight(id) {
    const entry = index.get(id);
    if (!entry) return;
    const { mat } = entry;
    if (mat.color) mat.color.setHex(HIGHLIGHT_COLOR_HEX);
    mat.opacity = HIGHLIGHT_OPACITY;
    mat.needsUpdate = true;
    currentEntry = entry;
  }

  const onHighlight = (p) => {
    const nextId = p?.id ?? null;
    // Idempotent : même id que courant ⇒ no-op.
    if (currentEntry && nextId && index.get(nextId) === currentEntry) return;
    restoreCurrent();
    if (nextId) applyHighlight(nextId);
  };

  const unsub = bus.on(UI.ORBIT_HIGHLIGHT, onHighlight);

  return {
    /** Liste des ids résolus (debug/tests). */
    getIndexedIds() { return Array.from(index.keys()); },
    destroy() {
      unsub();
      restoreCurrent();
      index.clear();
    },
  };
}
