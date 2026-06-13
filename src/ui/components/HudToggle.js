// HudToggle (LOT 5) — bouton isolé pour masquer/afficher TOUT le HUD.
// Garde uniquement lui-même visible quand le HUD est masqué.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { t } from '../core/i18n.js';

export function mountHudToggle(appRoot) {
  if (!appRoot) throw new Error('HudToggle: appRoot manquant');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hud-toggle';
  btn.setAttribute('aria-pressed', 'true');
  btn.setAttribute('aria-label', t('hud.toggleLabel'));
  btn.title = t('hud.toggleLabel');
  btn.innerHTML = `<span aria-hidden="true">⌐</span>`;

  let visible = true;
  function apply() {
    appRoot.classList.toggle('is-hud-hidden', !visible);
    btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
  }

  function toggle() { visible = !visible; apply(); }

  btn.addEventListener('click', toggle);
  const unsub = bus.on(UI.HUD_TOGGLE, toggle);

  appRoot.appendChild(btn);
  return {
    el: btn,
    destroy() { unsub(); btn.remove(); },
  };
}
