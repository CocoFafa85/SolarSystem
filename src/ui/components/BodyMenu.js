// BodyMenu (LOT 5B) — sections côte-à-côte, event delegation, toggle orbites
// en première position de la liste, Pluton trié en dernier avec badge.
//
// CONTRAT PROFILE C #1 — Event Delegation OBLIGATOIRE :
// Une seule série de listeners attachée à chaque <ul>, indépendamment du
// nombre d'items. Pas d'allocation de handler par bouton.

import * as bus from '../core/eventBus.js';
import { UI, ENGINE } from '../core/channels.js';
import { t } from '../core/i18n.js';

const HOVER_DEBOUNCE_MS = 80;
const ORBITS_TOGGLE_ID = '__orbits-toggle__'; // valeur sentinelle pour data-body-id

// LOT 6 — sortDwarfsLast retiré : les naines vivent désormais dans leur
// propre section. Pluton n'est plus dans groups.planets.

function makeOrbitToggleItem(channel, labelKey) {
  // L'item ENTIER est cliquable — la <li> sert de zone de capture pour la
  // delegation. La <button> interne porte l'état ARIA (role=switch) mais
  // n'absorbe pas le clic seule (cf. delegation onClick).
  const li = document.createElement('li');
  li.className = 'body-menu__item body-menu__item--orbits-toggle';
  li.setAttribute('data-body-id', ORBITS_TOGGLE_ID);

  const lbl = document.createElement('span');
  lbl.className = 'orbit-label';
  lbl.textContent = t('menu.orbitsShort');

  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'bm__orbit-toggle';
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', 'false');
  sw.setAttribute('aria-label', t(labelKey));
  sw.dataset.orbitChannel = channel;
  // Plus de pastille — l'état visuel passe par aria-checked + CSS.

  li.append(lbl, sw);
  return li;
}

function makeItem(vm) {
  // LOT 6 : plus d'indicateur "i" pour les naines — la section dédiée
  // "Planètes naines" rend l'info redondante.
  // LOT 7 : la Lune reçoit un modifier --moon (visible uniquement quand
  // .body-menu est en état `.is-earth-active` ou `.is-locked-earth`).
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'body-menu__item' + (vm.id === 'moon' ? ' body-menu__item--moon' : '');
  btn.style.setProperty('--accent', vm.accent);
  btn.setAttribute('data-body-id', vm.id);
  btn.setAttribute('aria-pressed', 'false');

  const dot = document.createElement('span');   dot.className = 'body-menu__dot'; dot.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span'); label.className = 'body-menu__label'; label.textContent = vm.name;
  btn.append(dot, label);

  if (vm.badgeKey) {
    const badge = document.createElement('span');
    badge.className = 'body-menu__badge';
    badge.textContent = t(vm.badgeKey);
    btn.appendChild(badge);
  }

  li.appendChild(btn);
  return { li, btn };
}

/**
 * Branche 5 listeners DÉLÉGUÉS sur le <ul> et retourne les items.
 * `dispatch` reçoit { kind: 'hover'|'click'|'orbit', id, channel?, evt }.
 */
function attachDelegation(list, dispatch) {
  function targetId(target) {
    const el = target?.closest?.('[data-body-id]');
    return el ? el.getAttribute('data-body-id') : null;
  }

  function onMouseOver(e) {
    const id = targetId(e.target);
    if (!id || id === ORBITS_TOGGLE_ID) return;
    // mouseover bulle ; on filtre les transitions internes
    if (e.relatedTarget && e.target.closest('[data-body-id]')?.contains(e.relatedTarget)) return;
    dispatch({ kind: 'hover', id });
  }
  function onMouseOut(e) {
    const id = targetId(e.target);
    if (!id || id === ORBITS_TOGGLE_ID) return;
    // Si on quitte vers un autre item du même ul, on émettra hover via mouseover ;
    // ici on signale uniquement la sortie quand on quitte la zone d'items.
    const rt = e.relatedTarget;
    if (rt && rt.closest && rt.closest('[data-body-id]')) return;
    dispatch({ kind: 'hover', id: null });
  }
  function onFocusIn(e) {
    const id = targetId(e.target);
    if (!id || id === ORBITS_TOGGLE_ID) return;
    dispatch({ kind: 'hover', id });
  }
  function onFocusOut(e) {
    const id = targetId(e.target);
    if (!id || id === ORBITS_TOGGLE_ID) return;
    const rt = e.relatedTarget;
    if (rt && rt.closest && list.contains(rt)) return;
    dispatch({ kind: 'hover', id: null });
  }
  function onClick(e) {
    const id = targetId(e.target);
    if (!id) return;
    if (id === ORBITS_TOGGLE_ID) {
      // Le clic SUR la ligne entière bascule — pas besoin de viser le <button>.
      // On retrouve le switch via le li intercepté (data-body-id sentinelle).
      const li = e.target.closest('[data-body-id="' + ORBITS_TOGGLE_ID + '"]');
      const sw = li?.querySelector('.bm__orbit-toggle');
      if (!sw) return;
      const checked = sw.getAttribute('aria-checked') === 'true';
      sw.setAttribute('aria-checked', checked ? 'false' : 'true');
      dispatch({ kind: 'orbit', channel: sw.dataset.orbitChannel, visible: !checked });
      return;
    }
    dispatch({ kind: 'click', id });
  }

  list.addEventListener('mouseover', onMouseOver);
  list.addEventListener('mouseout',  onMouseOut);
  list.addEventListener('focusin',   onFocusIn);
  list.addEventListener('focusout',  onFocusOut);
  list.addEventListener('click',     onClick);

  return () => {
    list.removeEventListener('mouseover', onMouseOver);
    list.removeEventListener('mouseout',  onMouseOut);
    list.removeEventListener('focusin',   onFocusIn);
    list.removeEventListener('focusout',  onFocusOut);
    list.removeEventListener('click',     onClick);
  };
}

function makeSection({ titleKey, bodies, orbitToggleChannel, orbitToggleLabelKey, openByDefault, dispatch }) {
  const section = document.createElement('section');
  section.className = 'body-menu__section';

  const summary = document.createElement('button');
  summary.type = 'button';
  summary.className = 'body-menu__summary';
  summary.setAttribute('aria-expanded', openByDefault ? 'true' : 'false');
  summary.innerHTML = `<span class="bm__chevron" aria-hidden="true">▾</span><span>${t(titleKey)}</span>`;

  const list = document.createElement('ul');
  list.className = 'body-menu__list';
  list.hidden = !openByDefault;

  // 1er <li> : toggle orbites
  list.appendChild(makeOrbitToggleItem(orbitToggleChannel, orbitToggleLabelKey));

  const items = new Map();
  bodies.forEach((vm) => {
    const { li, btn } = makeItem(vm);
    list.appendChild(li);
    items.set(vm.id, btn);
  });

  summary.addEventListener('click', () => {
    const open = summary.getAttribute('aria-expanded') === 'true';
    summary.setAttribute('aria-expanded', open ? 'false' : 'true');
    list.hidden = open;
  });

  const detach = attachDelegation(list, dispatch);

  section.append(summary, list);
  return { section, items, detach };
}

export function mountBodyMenu(container, groups) {
  if (!container) throw new Error('BodyMenu: container manquant');

  const root = document.createElement('nav');
  root.className = 'body-menu panel';
  root.setAttribute('aria-label', t('hud.leftLabel'));

  let lastLockedId = null;
  let hoverTimer = 0;
  let lastHoverEmitted = undefined;

  function emitHover(id) {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (id === lastHoverEmitted) return;
      lastHoverEmitted = id;
      // LOT 9 — survol BodyMenu = brillance d'orbite, SANS mouvement caméra.
      // UI.VIEW_HOVER abandonné ici (le glossaire reste sa seule source).
      bus.emit(UI.ORBIT_HIGHLIGHT, { id });
    }, HOVER_DEBOUNCE_MS);
  }

  function dispatch(ev) {
    if (ev.kind === 'hover') {
      // LOT 9 — hover-out NE retombe PAS sur lastLockedId : on éteint la
      // brillance, point. Le verrou caméra est indépendant (UI.VIEW_FOCUS).
      const id = ev.id;
      emitHover(id);
      // LOT 7 — survol de la Terre fait apparaître la Lune.
      root.classList.toggle('is-earth-active', id === 'earth');
    } else if (ev.kind === 'click') {
      lastLockedId = ev.id;
      // Verrou Terre → Lune reste affichée tant que le lock n'a pas changé.
      root.classList.toggle('is-locked-earth', ev.id === 'earth');
      bus.emit(UI.BODY_SELECT, { id: ev.id });
      bus.emit(UI.VIEW_FOCUS,  { id: ev.id });
    } else if (ev.kind === 'orbit') {
      bus.emit(ev.channel, { visible: ev.visible });
    }
  }

  const allItems = new Map();
  const sectionsDetach = [];

  // LOT 6 — toutes les sections fermées par défaut.
  const planets = makeSection({
    titleKey: 'menu.planets',
    bodies: groups.planets,
    orbitToggleChannel: UI.ORBITS_TOGGLE_PLANETS,
    orbitToggleLabelKey: 'menu.toggleOrbitsPlanets',
    openByDefault: false,
    dispatch,
  });
  planets.items.forEach((b, id) => allItems.set(id, b));
  sectionsDetach.push(planets.detach);
  root.appendChild(planets.section);

  if (groups.dwarfs?.length) {
    const dwarfs = makeSection({
      titleKey: 'menu.dwarfPlanets',
      bodies: groups.dwarfs,
      orbitToggleChannel: UI.ORBITS_TOGGLE_DWARFS,
      orbitToggleLabelKey: 'menu.toggleOrbitsDwarfs',
      openByDefault: false,
      dispatch,
    });
    dwarfs.items.forEach((b, id) => allItems.set(id, b));
    sectionsDetach.push(dwarfs.detach);
    root.appendChild(dwarfs.section);
  }

  const minor = makeSection({
    titleKey: 'menu.minorBodies',
    bodies: groups.minor,
    orbitToggleChannel: UI.ORBITS_TOGGLE_MINOR,
    orbitToggleLabelKey: 'menu.toggleOrbitsMinor',
    openByDefault: false,
    dispatch,
  });
  minor.items.forEach((b, id) => allItems.set(id, b));
  sectionsDetach.push(minor.detach);
  root.appendChild(minor.section);

  let selectedId = null;
  function applySelection(id) {
    if (selectedId === id) return;
    if (selectedId) allItems.get(selectedId)?.setAttribute('aria-pressed', 'false');
    selectedId = id;
    if (id) allItems.get(id)?.setAttribute('aria-pressed', 'true');
  }

  const unsubA = bus.on(UI.BODY_SELECT,       (p) => applySelection(p?.id ?? null));
  const unsubB = bus.on(ENGINE.BODY_SELECTED, (p) => applySelection(p?.id ?? null));

  container.appendChild(root);

  return {
    el: root,
    destroy() {
      clearTimeout(hoverTimer);
      sectionsDetach.forEach((d) => d());
      unsubA(); unsubB();
      root.remove();
    },
  };
}
