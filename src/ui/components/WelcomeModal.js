// WelcomeModal (LOT 10) — premier contact utilisateur.
// - Mount unique dans slots.app, toggle via `hidden`.
// - Persistance sessionStorage + détection reload (F5/Ctrl+F5) :
//     1ère visite → modale ; reload → modale ; onglet fermé/rouvert → modale ;
//     fermeture dans la session → reste fermée.
// - Texte hardcodé FR (pas d'i18n) pour éviter les pièges de cache locale.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { mountMailRevealer } from './MailRevealer.js';

const STORAGE_KEY = 'solar.welcomeSeen';

const TXT = {
  title:   'Bienvenue',
  closeLabel: 'Fermer',
  // Markdown léger : **gras** / *italique* parsés ci-dessous.
  paragraph:
    "Bienvenue dans une simulation réaliste du système solaire !\n" + 
    "Oui vraiment **réaliste** : les échelles de temps et de distance sont rigoureusement respectées, ce qui peut être un peu déroutant au début.\n" + 
    "L'objectif est de représenter physiquement les ordres de grandeur de l'espace et illustrer quelques concepts-clés de l'astronomie sans trop de jargon.\n" + 
    "Tu peux naviguer entre les astres, accélérer le temps (attention au tourni), comparer des données ou encore parcourir le glossaire.\n" + 
    "Si quelque chose casse ou si tu as une idée intéressante contacte moi : ",
  cta: 'Bon voyage',
};

function md(str) {
  return String(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // \n\n → saut de paragraphe visuel ; \n simple → <br>.
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function shouldShow() {
  // Détection reload : F5 ou Ctrl+F5 → on efface le flag pour ré-afficher.
  try {
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    if (nav?.type === 'reload') sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* SSR ou storage refusé */ }
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== '1';
  } catch { return true; }
}

export function mountWelcomeModal(container) {
  if (!container) throw new Error('WelcomeModal: container manquant');

  const root = document.createElement('div');
  root.className = 'welcome';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'welcome-title');
  root.setAttribute('aria-describedby', 'welcome-body');
  root.hidden = true;

  const backdrop = document.createElement('div');
  backdrop.className = 'welcome__backdrop';

  const card = document.createElement('div');
  card.className = 'welcome__card panel';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'welcome__close';
  closeBtn.setAttribute('aria-label', TXT.closeLabel);
  closeBtn.innerHTML = '<span aria-hidden="true">×</span>';

  const title = document.createElement('h2');
  title.id = 'welcome-title';
  title.className = 'welcome__title';
  title.textContent = TXT.title;

  const body = document.createElement('div');
  body.id = 'welcome-body';
  body.className = 'welcome__body';

  const para = document.createElement('p');
  para.className = 'welcome__p';
  para.innerHTML = md(TXT.paragraph);
  body.appendChild(para);

  // Mail inline à la suite directe du paragraphe (même flux <p>).
  const mailWrap = document.createElement('span');
  mailWrap.className = 'welcome__contact';
  const mailer = mountMailRevealer(mailWrap);
  para.appendChild(mailWrap);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'welcome__cta';
  cta.textContent = TXT.cta;

  card.append(closeBtn, title, body, cta);
  root.append(backdrop, card);
  container.appendChild(root);

  // --- Focus trap minimal --------------------------------------------------
  let lastFocus = null;
  function focusables() {
    return card.querySelectorAll(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
  }
  function trap(e) {
    if (e.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    trap(e);
  }

  function open() {
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.addEventListener('keydown', onKey);
    setTimeout(() => cta.focus(), 0);
  }
  function close() {
    if (root.hidden) return;
    root.hidden = true;
    document.removeEventListener('keydown', onKey);
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* */ }
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    bus.emit(UI.WELCOME_CLOSE, null);
  }

  cta.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  const unsubOpen  = bus.on(UI.WELCOME_OPEN,  open);
  const unsubClose = bus.on(UI.WELCOME_CLOSE, () => { /* émis par close() */ });

  if (typeof window !== 'undefined') {
    window.__welcomeReset = () => {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* */ }
      open();
    };
  }

  if (shouldShow()) open();

  return {
    el: root,
    destroy() {
      cta.removeEventListener('click', close);
      closeBtn.removeEventListener('click', close);
      backdrop.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
      unsubOpen(); unsubClose();
      mailer.destroy();
      root.remove();
      if (typeof window !== 'undefined' && window.__welcomeReset) {
        delete window.__welcomeReset;
      }
    },
  };
}
