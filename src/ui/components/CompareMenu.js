// CompareMenu (LOT 5) — UNIQUEMENT les boutons de tri par métrique.
// Le bouton Soleil a été retiré (déplacé hors menu). Le bouton Événements
// est lui aussi sorti (désormais dans EventStats compact en hud-top).
// Ce menu est masqué par défaut et basculé via UI.COMPARE_MENU_TOGGLE.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { t } from '../core/i18n.js';

const METRICS = [
  { key: 'mass',          icon: '⚖' },
  { key: 'size',          icon: '◯' },
  { key: 'temp',          icon: '🌡' },
  { key: 'orbitalSpeed',  icon: '➤' },
  { key: 'rotationSpeed', icon: '↻' },
];

export function mountCompareMenu(container) {
  if (!container) throw new Error('CompareMenu: container manquant');

  const root = document.createElement('div');
  root.className = '';
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', t('compare.menuLabel'));
  root.hidden = true;

  METRICS.forEach(({ key, icon }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cm__btn';
    btn.setAttribute('aria-label', t(`compare.metric.${key}`));
    btn.title = t(`compare.metric.${key}`);
    btn.innerHTML = `<span class="cm__icon" aria-hidden="true">${icon}</span><span class="cm__label">${t(`compare.metricShort.${key}`)}</span>`;
    // LOT 8 — NE PAS fermer le menu au clic d'un bouton de tri. Le menu ne
    // se ferme que via UI.COMPARE_MENU_TOGGLE (clic sur le trigger Comparer).
    // L'utilisateur peut ainsi enchaîner masse → taille → vitesse sans
    // ré-ouvrir le menu à chaque fois.
    btn.addEventListener('click', () => {
      bus.emit(UI.COMPARE_SHOW, { metric: key });
    });
    root.appendChild(btn);
  });

  const unsub = bus.on(UI.COMPARE_MENU_TOGGLE, () => { root.hidden = !root.hidden; });

  container.appendChild(root);
  return {
    el: root,
    destroy() { unsub(); root.remove(); },
  };
}
