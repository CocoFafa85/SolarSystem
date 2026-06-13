// GlossaryButton (LOT 7) — déclencheur de la modale Glossaire.
// Émet UI.GLOSSARY_OPEN au clic.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { t } from '../core/i18n.js';

export function mountGlossaryButton(container) {
  if (!container) throw new Error('GlossaryButton: container manquant');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'glossary-btn';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-label', t('glossary.openLabel'));
  btn.title = t('glossary.openLabel');
  btn.innerHTML = `<span aria-hidden="true">📖</span><span class="glossary-btn__label">${t('glossary.openShort')}</span>`;

  const onClick = () => bus.emit(UI.GLOSSARY_OPEN, null);
  btn.addEventListener('click', onClick);

  container.appendChild(btn);
  return {
    el: btn,
    destroy() { btn.removeEventListener('click', onClick); btn.remove(); },
  };
}
