// BodyMenuToggle (LOT 7) — bouton "Astres" qui déploie le BodyMenu en-dessous.
// Le BodyMenu reste MONTÉ EN PERMANENCE (contrat C #2 LOT 5B) ; seul son
// attribut `hidden` est basculé. Aucun remount ne se produit au toggle.

import { mountBodyMenu } from './BodyMenu.js';
import { t } from '../core/i18n.js';

export function mountBodyMenuToggle(container, groups) {
  if (!container) throw new Error('BodyMenuToggle: container manquant');

  const wrap = document.createElement('div');
  wrap.className = 'body-menu-toggle';
  container.appendChild(wrap);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'body-menu-toggle__btn panel';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-label', t('menu.openLabel'));
  btn.title = t('menu.openLabel');
  btn.textContent = t('menu.openShort');
  wrap.appendChild(btn);

  // BodyMenu monté UNE SEULE FOIS, en-dessous du bouton, masqué par défaut.
  const menu = mountBodyMenu(wrap, groups);
  menu.el.hidden = true;

  function onClick() {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    menu.el.hidden = open;
  }
  btn.addEventListener('click', onClick);

  return {
    el: wrap,
    destroy() {
      btn.removeEventListener('click', onClick);
      menu.destroy();
      wrap.remove();
    },
  };
}
