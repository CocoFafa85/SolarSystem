// EventStats (LOT 5C) — panneau INLINE dans hud-top, toujours visible.
// La modale détachée et le déclencheur dans time-controls sont supprimés.
//
// CONTRAT PROFILE C #3 : aucun remount. Le DOM est créé une fois ; les
// abonnements ENGINE.EVENT_DETECTED + UI.TIME_RESET restent actifs.
// UI.EVENTS_TOGGLE est conservé pour offrir un repli/dépli (classe
// `is-collapsed`) sans recréer le panneau.

import * as bus from '../core/eventBus.js';
import { UI, ENGINE, EVENT_TYPES } from '../core/channels.js';
import { t } from '../core/i18n.js';

const KNOWN = Object.keys(EVENT_TYPES);

function makeRow(type, descriptor) {
  const row = document.createElement('li');
  row.className = `event-stats__row event-stats__row--${descriptor.kind}`;
  row.style.setProperty('--accent', descriptor.accent);
  row.tabIndex = 0;
  row.setAttribute('aria-describedby', `evt-tip-${type}`);

  const dot = document.createElement('span');
  dot.className = 'event-stats__dot';
  dot.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'event-stats__name';
  name.textContent = t(descriptor.i18n);

  const count = document.createElement('span');
  count.className = 'event-stats__count';
  count.textContent = '0';

  const tip = document.createElement('span');
  tip.className = 'event-stats__tip';
  tip.id = `evt-tip-${type}`;
  tip.setAttribute('role', 'tooltip');
  tip.textContent = t(descriptor.tooltip);

  row.append(dot, name, count, tip);
  return { row, count };
}

export function mountEventStats(container) {
  if (!container) throw new Error('EventStats: container manquant');

  const root = document.createElement('section');
  root.className = 'event-stats event-stats--compact panel';
  root.setAttribute('aria-label', t('events.panelLabel'));
  // LOT 5D — fermé par défaut, le déclencheur EventsButton bascule via
  // UI.EVENTS_TOGGLE → root.hidden (aucun remount du DOM ni des abonnements).
  root.hidden = true;

  const list = document.createElement('ul');
  list.className = 'event-stats__list';
  root.appendChild(list);

  const rows = {};
  KNOWN.forEach((type) => {
    const r = makeRow(type, EVENT_TYPES[type]);
    rows[type] = { count: r.count, n: 0 };
    list.appendChild(r.row);
  });

  function increment(type) {
    const r = rows[type];
    if (!r) return;
    r.n += 1;
    r.count.textContent = String(r.n);
  }
  function resetAll() {
    KNOWN.forEach((type) => {
      const r = rows[type];
      r.n = 0;
      r.count.textContent = '0';
    });
  }

  const unsubEvt   = bus.on(ENGINE.EVENT_DETECTED, (p = {}) => p.type && increment(p.type));
  const unsubTog   = bus.on(UI.EVENTS_TOGGLE, () => { root.hidden = !root.hidden; });
  const unsubReset = bus.on(UI.EVENTS_RESET, resetAll);
  const unsubTime  = bus.on(UI.TIME_RESET,   resetAll);

  container.appendChild(root);

  return {
    el: root,
    destroy() { unsubEvt(); unsubTog(); unsubReset(); unsubTime(); root.remove(); },
  };
}
