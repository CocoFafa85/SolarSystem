// GlossaryModal (LOT 10C) — panneau de termes pédagogiques.
// LOT 10B.2 : non bloquant — le canvas Three.js reste interactif quand ouvert.
//   - plus de role=dialog / aria-modal ; backdrop ne capture pas le clic ;
//   - fermeture : bouton × ou touche Escape uniquement.
// LOT 10C.1 : animations dormantes par défaut, jouent au hover/focus du
//   `.glossary__item` survolé UNIQUEMENT — via event delegation (4 listeners
//   totaux sur listWrap), SMIL `<animate*>` armé en `begin="indefinite"` à
//   l'insertion + `.beginElement()` au hover, CSS `@keyframes` en
//   `animation-play-state: paused` reverti en `running` sous `:hover`.
// CONTRAT C #2 (LOT 5B) : DOM monté UNE SEULE FOIS ; toggle bascule `hidden`.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { t } from '../core/i18n.js';
import { renderGlossarySvg, hasGlossarySvg } from './glossarySvgs.js';
import glossaryDataFr from '../../data/glossaryDataFr.js';

const TERMS = glossaryDataFr.terms;
const REDUCED_MOTION = (typeof matchMedia === 'function')
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

function renderItem(term) {
  const li = document.createElement('li');
  li.className = 'glossary__item';
  // LOT 10D — items NON interactifs : pas de tabIndex (donc pas de focus
  // au clic), pas de listener click. Seul le hover souris déclenche l'anim.
  li.setAttribute('data-term-id', term.id);

  const text = document.createElement('div');
  text.className = 'glossary__text';
  const head = document.createElement('h3'); head.className = 'glossary__term';   head.textContent = term.term;
  const def  = document.createElement('p');  def.className  = 'glossary__def';    def.textContent  = term.def;
  text.append(head, def);
  li.appendChild(text);

  const svgName = term.animation?.kind === 'overlay' ? term.animation?.svg : null;
  if (svgName && hasGlossarySvg(svgName)) {
    const fig = document.createElement('div');
    fig.className = 'glossary__svg-wrap';
    fig.setAttribute('aria-live', 'polite');
    fig.innerHTML = renderGlossarySvg(svgName);
    // LOT 10C.1 — TOUS les SMIL armés à `indefinite` (plus seulement sous
    // reduced-motion) : le hover déclenche `.beginElement()`.
    const anims = fig.querySelectorAll('animate, animateTransform, animateMotion');
    for (let j = 0; j < anims.length; j++) anims[j].setAttribute('begin', 'indefinite');
    li.appendChild(fig);
  }
  return li;
}

// LOT 10C.1 — pilotage hover-only des animations SMIL d'un item.
function startItemAnims(item) {
  if (REDUCED_MOTION || !item) return;
  const svg = item.querySelector('svg');
  if (!svg) return;
  const anims = svg.querySelectorAll('animate, animateTransform, animateMotion');
  for (let i = 0; i < anims.length; i++) {
    try { anims[i].beginElement(); } catch (_) { /* SMIL absent */ }
  }
}
function stopItemAnims(item) {
  if (!item) return;
  const svg = item.querySelector('svg');
  if (!svg) return;
  const anims = svg.querySelectorAll('animate, animateTransform, animateMotion');
  for (let i = 0; i < anims.length; i++) {
    try { anims[i].endElement(); } catch (_) {}
  }
  try { svg.setCurrentTime(0); } catch (_) {}
}

export function mountGlossaryModal(appRoot) {
  if (!appRoot) throw new Error('GlossaryModal: appRoot manquant');

  const backdrop = document.createElement('div');
  backdrop.className = 'glossary-overlay';
  backdrop.setAttribute('aria-labelledby', 'glossary-title');
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'glossary-overlay__modal panel';

  const header = document.createElement('header');
  header.className = 'glossary-overlay__header';
  const title = document.createElement('h2'); title.id = 'glossary-title'; title.className = 'glossary-overlay__title';
  title.textContent = t('glossary.title');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'glossary-overlay__close';
  close.setAttribute('aria-label', t('common.close'));
  close.textContent = '×';
  header.append(title, close);

  const listWrap = document.createElement('ul');
  listWrap.className = 'glossary__list';

  modal.append(header, listWrap);
  backdrop.appendChild(modal);
  appRoot.appendChild(backdrop);

  let loaded = false;
  function ensureLoaded() {
    if (loaded) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < TERMS.length; i++) {
      frag.appendChild(renderItem(TERMS[i]));
    }
    listWrap.replaceChildren(frag);
    loaded = true;
  }

  function show()  { backdrop.hidden = false; ensureLoaded(); close.focus(); }
  function hide()  { backdrop.hidden = true; }

  close.addEventListener('click', () => bus.emit(UI.GLOSSARY_CLOSE, null));

  const onKey = (e) => { if (!backdrop.hidden && e.key === 'Escape') bus.emit(UI.GLOSSARY_CLOSE, null); };
  document.addEventListener('keydown', onKey);

  // LOT 10C.1 — event delegation (4 listeners totaux quel que soit le nb d'items).
  // mouseenter/leave ne bullent pas ; on utilise mouseover/out + filtre
  // `relatedTarget` pour ignorer les mouvements internes à l'item.
  let activeItem = null;
  const findItem = (el) => (el && el.closest) ? el.closest('.glossary__item') : null;
  const activate = (item) => {
    if (!item || item === activeItem) return;
    if (activeItem) stopItemAnims(activeItem);
    activeItem = item;
    startItemAnims(item);
  };
  const deactivate = (item) => {
    if (!item || item !== activeItem) return;
    stopItemAnims(item);
    activeItem = null;
  };
  const onOver = (e) => activate(findItem(e.target));
  const onOut  = (e) => {
    const item = findItem(e.target);
    if (!item || item !== activeItem) return;
    if (e.relatedTarget && item.contains(e.relatedTarget)) return;
    deactivate(item);
  };
  // LOT 10D — listeners focusin/focusout retirés : aucun déclencheur lié au
  // clic/focus. 2 listeners totaux sur listWrap (mouseover + mouseout).
  listWrap.addEventListener('mouseover', onOver);
  listWrap.addEventListener('mouseout',  onOut);

  const unsubOpen  = bus.on(UI.GLOSSARY_OPEN, show);
  const unsubClose = bus.on(UI.GLOSSARY_CLOSE, hide);

  return {
    el: backdrop,
    destroy() {
      unsubOpen(); unsubClose();
      document.removeEventListener('keydown', onKey);
      listWrap.removeEventListener('mouseover', onOver);
      listWrap.removeEventListener('mouseout',  onOut);
      backdrop.remove();
    },
  };
}
