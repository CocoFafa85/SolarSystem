// PoVMenu — menu déroulant "Point de Vue" intégré au time-controls.
// Ouverture au survol (desktop) / clic (tactile). Émet UI.VIEW_PRESET.
// Le calcul des distances caméra est délégué au moteur (Profile A).

import * as bus from '../core/eventBus.js';
import { UI, VIEW_PRESETS } from '../core/channels.js';
import { t } from '../core/i18n.js';

export function mountPoVMenu(toolbar) {
  const wrap = document.createElement('div');
  wrap.className = 'pov';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'tc__btn pov__trigger';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', t('pov.label'));
  trigger.title = t('pov.label');
  trigger.innerHTML = `<span aria-hidden="true">👁</span>`;

  const menu = document.createElement('ul');
  menu.className = 'pov__menu panel';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  VIEW_PRESETS.forEach((preset) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'none');
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'pov__item';
    item.setAttribute('role', 'menuitem');
    item.textContent = t(`pov.preset.${preset}`);
    // LOT 8B — câblage restauré (avait été commenté, cause de la régression PoV).
    item.addEventListener('click', () => {
      bus.emit(UI.VIEW_PRESET, { preset });
      close();
    });
    li.appendChild(item);
    menu.appendChild(li);
  });

  function open()  { menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); }
  function close() { menu.hidden = true;  trigger.setAttribute('aria-expanded', 'false'); }

  // Hover desktop + clic mobile.
  let hoverTimer = 0;
  wrap.addEventListener('mouseenter', () => { clearTimeout(hoverTimer); open(); });
  wrap.addEventListener('mouseleave', () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(close, 180); });
  trigger.addEventListener('click', () => (menu.hidden ? open() : close()));
  trigger.addEventListener('focus', open);

  // Profile C — listener nommé pour pouvoir être détaché au destroy.
  // Une closure anonyme `addEventListener` ne peut PAS être retirée → leak
  // garanti sur chaque cycle bootUI()/ui.destroy().
  const onKeyDown = (e) => { if (!menu.hidden && e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKeyDown);

  wrap.append(trigger, menu);
  toolbar.appendChild(wrap);

  return {
    el: wrap,
    destroy() {
      clearTimeout(hoverTimer);
      document.removeEventListener('keydown', onKeyDown);
      wrap.remove();
    },
  };
}
