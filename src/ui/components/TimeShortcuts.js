// TimeShortcuts (LOT 6B) — raccourcis clavier temps.
//
// Contrat C : UN SEUL `window.addEventListener('keydown', …, { passive: true })`
// au niveau du composant, retiré au destroy().
//
// Bindings :
//   Space      → UI.TIME_TOGGLE
//   ArrowRight → UI.TIME_STEP_SPEED { factor: 2 }
//   ArrowLeft  → UI.TIME_STEP_SPEED { factor: 0.5 }
//   Digit1     → UI.TIME_SET_SPEED  { speed: 1 }
//   KeyR       → UI.TIME_RESET
//
// Skip si la cible est un champ de saisie ou si IME en cours.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';

const SKIP_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function mountTimeShortcuts() {
  function onKey(e) {
    if (e.isComposing) return;
    const tag = e.target?.tagName;
    if (tag && SKIP_TAGS.has(tag)) return;
    if (e.target?.isContentEditable) return;

    switch (e.code) {
      case 'Space':
        bus.emit(UI.TIME_TOGGLE, null);
        // L'événement keydown ne peut être prévenu en mode passive ; on tolère
        // un éventuel scroll de la page (overflow déjà à hidden via reset.css).
        return;
      case 'ArrowRight':
        bus.emit(UI.TIME_STEP_SPEED, { factor: 2 });
        return;
      case 'ArrowLeft':
        bus.emit(UI.TIME_STEP_SPEED, { factor: 0.5 });
        return;
      case 'Digit1':
        bus.emit(UI.TIME_SET_SPEED, { speed: 1 });
        return;
      case 'KeyR':
        bus.emit(UI.TIME_RESET, null);
        return;
    }
  }

  window.addEventListener('keydown', onKey, { passive: true });

  return {
    destroy() {
      window.removeEventListener('keydown', onKey);
    },
  };
}
