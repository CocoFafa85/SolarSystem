// EventsButton (LOT 5D) — déclencheur compact ouvrant/fermant le panneau
// EventStats (déjà monté dans slot.top). N'opère que sur UI.EVENTS_TOGGLE :
// aucun mount/destroy du panneau, aucun état local conservé.
//
// CONTRAT PROFILE C #4 : un seul addEventListener click, retiré au destroy.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { t } from '../core/i18n.js';

export function mountEventsButton(container) {
  if (!container) throw new Error('EventsButton: container manquant');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'events-button panel';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-label', t('events.triggerLabel'));
  btn.title = t('events.triggerLabel');
  btn.textContent = t('events.triggerShort');

  const onClick = () => bus.emit(UI.EVENTS_TOGGLE, null);
  btn.addEventListener('click', onClick);

  container.appendChild(btn);
  return {
    el: btn,
    destroy() {
      btn.removeEventListener('click', onClick);
      btn.remove();
    },
  };
}
