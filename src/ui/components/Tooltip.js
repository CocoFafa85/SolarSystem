// Tooltip (LOT 6) — singleton DOM léger, monté UNE seule fois dans .app.
// API impérative simple :
//   tooltip.showFor(targetEl, text, opts?)
//   tooltip.showAt(x, y, text, opts?)
//   tooltip.hide()
//
// Aucun listener global : c'est aux consommateurs (TimeControls,
// SeasonMarkerTip…) de choisir QUAND afficher/cacher. Le composant ne
// fait que positionner.
//
// CONTRAT PROFILE C #6 : un seul nœud DOM partagé pour TOUS les tooltips ;
// jamais d'allocation par mousemove (la position passe par `transform`).

import { t } from '../core/i18n.js';

let _instance = null;

function place(el, x, y, anchor = 'top') {
  // Décale au-dessus (ou au-dessous) du point ciblé, centré horizontalement.
  const offset = 8;
  const dy = anchor === 'bottom' ? offset : -offset - el.offsetHeight;
  el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y + dy)}px) translateX(-50%)`;
}

export function mountTooltip(appRoot) {
  if (_instance) return _instance;
  if (!appRoot) throw new Error('Tooltip: appRoot manquant');

  const el = document.createElement('div');
  el.className = 'tooltip';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  appRoot.appendChild(el);

  const api = {
    el,
    /** Affiche au-dessus d'un élément (utilise getBoundingClientRect une fois). */
    showFor(targetEl, text, opts = {}) {
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      el.textContent = text;
      el.hidden = false;
      // Première mise à jour pour mesurer offsetHeight, puis position définitive.
      el.style.transform = 'translate(-9999px,-9999px)';
      requestAnimationFrame(() => place(el, x, y, opts.anchor || 'top'));
    },
    showAt(x, y, text, opts = {}) {
      el.textContent = text;
      el.hidden = false;
      el.style.transform = 'translate(-9999px,-9999px)';
      requestAnimationFrame(() => place(el, x, y, opts.anchor || 'top'));
    },
    hide() { el.hidden = true; },
    /** Helper i18n. */
    showI18nFor(targetEl, key, opts) { this.showFor(targetEl, t(key), opts); },
    destroy() {
      el.remove();
      if (_instance === api) _instance = null;
    },
  };

  _instance = api;
  return api;
}

export function getTooltip() { return _instance; }
