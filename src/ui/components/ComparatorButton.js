// ComparatorButton (LOT 5) — déclencheur du CompareMenu, ancré en haut à droite.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { t } from '../core/i18n.js';

export function mountComparatorButton(container) {
  if (!container) throw new Error('ComparatorButton: container manquant');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'comparator-btn';
  btn.setAttribute('aria-label', t('compare.openLabel'));
  btn.title = t('compare.openLabel');
  btn.innerHTML = `<span aria-hidden="true">⚖</span><span class="comparator-btn__label">${t('compare.openShort')}</span>`;
  btn.addEventListener('click', () => bus.emit(UI.COMPARE_MENU_TOGGLE, null));

  container.appendChild(btn);
  return { el: btn, destroy() { btn.remove(); } };
}
