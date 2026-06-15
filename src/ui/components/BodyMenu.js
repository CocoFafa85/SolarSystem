// BodyMenu (LOT 16 #12) — refonte 4 sections indépendantes + stack slots.
//
// Structure :
//   - 4 boutons toggles verticaux (Planètes / Naines / Satellites / Comètes)
//   - 4 slots empilés à droite (ou en dessous sur mobile)
//   - chaque section ouverte prend le plus petit slot libre, dans l'ordre
//     chronologique d'ouverture. À la fermeture, les suivantes glissent.
//
// CONTRAT PROFILE C #1 — Event Delegation préservée : 5 listeners par <ul>.
// CONTRAT C #2 — Sections montées une seule fois, déplacées entre slots via
// appendChild (pas de remount, pas d'allocation de handler).
//
// Animation : transition opacity/transform 250ms à l'entrée d'une section
// dans son slot, désactivée sous prefers-reduced-motion via CSS.

import * as bus from '../core/eventBus.js';
import { UI, ENGINE } from '../core/channels.js';
import { t } from '../core/i18n.js';

const HOVER_DEBOUNCE_MS = 80;
const ORBITS_TOGGLE_ID = '__orbits-toggle__';
const SLOT_COUNT = 5;

function makeOrbitToggleItem(channel, labelKey) {
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

  li.append(lbl, sw);
  return li;
}

function makeItem(vm) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'body-menu__item';
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

function attachDelegation(list, dispatch) {
  function targetId(target) {
    const el = target?.closest?.('[data-body-id]');
    return el ? el.getAttribute('data-body-id') : null;
  }

  function onMouseOver(e) {
    const id = targetId(e.target);
    if (!id || id === ORBITS_TOGGLE_ID) return;
    if (e.relatedTarget && e.target.closest('[data-body-id]')?.contains(e.relatedTarget)) return;
    dispatch({ kind: 'hover', id });
  }
  function onMouseOut(e) {
    const id = targetId(e.target);
    if (!id || id === ORBITS_TOGGLE_ID) return;
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

function buildSection({ id, bodies, orbitChannel, orbitLabelKey, dispatch }) {
  const section = document.createElement('section');
  section.className = 'body-menu__section';
  section.dataset.sectionId = id;

  const list = document.createElement('ul');
  list.className = 'body-menu__list';
  list.appendChild(makeOrbitToggleItem(orbitChannel, orbitLabelKey));

  const items = new Map();
  bodies.forEach((vm) => {
    const { li, btn } = makeItem(vm);
    list.appendChild(li);
    items.set(vm.id, btn);
  });

  const detach = attachDelegation(list, dispatch);
  section.appendChild(list);
  return { section, items, detach };
}

export function mountBodyMenu(container, groups) {
  if (!container) throw new Error('BodyMenu: container manquant');

  const root = document.createElement('nav');
  root.className = 'body-menu panel';
  root.setAttribute('aria-label', t('hud.leftLabel'));

  let hoverTimer = 0;
  let lastHoverEmitted = undefined;
  let lastLockedId = null;

  function emitHover(id) {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (id === lastHoverEmitted) return;
      lastHoverEmitted = id;
      bus.emit(UI.ORBIT_HIGHLIGHT, { id });
    }, HOVER_DEBOUNCE_MS);
  }

  function dispatch(ev) {
    if (ev.kind === 'hover') {
      emitHover(ev.id);
    } else if (ev.kind === 'click') {
      lastLockedId = ev.id;
      bus.emit(UI.BODY_SELECT, { id: ev.id });
      bus.emit(UI.VIEW_FOCUS,  { id: ev.id });
    } else if (ev.kind === 'orbit') {
      bus.emit(ev.channel, { visible: ev.visible });
    }
  }

  // --- Toggles colonne -----------------------------------------------------
  const togglesEl = document.createElement('div');
  togglesEl.className = 'body-menu__toggles';
  togglesEl.setAttribute('role', 'group');

  // --- Slots ---------------------------------------------------------------
  const slotsEl = document.createElement('div');
  slotsEl.className = 'body-menu__slots';
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const s = document.createElement('div');
    s.className = 'body-menu__slot';
    s.dataset.slot = String(i);
    slotsEl.appendChild(s);
    slots.push(s);
  }

  // --- Définition des 4 sections (data-driven) -----------------------------
  const SECTIONS_DEF = [
    { id: 'planets',    titleKey: 'menu.sectionPlanets',    list: groups.planets    || [], chan: UI.ORBITS_TOGGLE_PLANETS,    labelKey: 'menu.toggleOrbitsPlanets' },
    { id: 'dwarfs',     titleKey: 'menu.sectionDwarfs',     list: groups.dwarfs     || [], chan: UI.ORBITS_TOGGLE_DWARFS,     labelKey: 'menu.toggleOrbitsDwarfs' },
    { id: 'satellites', titleKey: 'menu.sectionSatellites', list: groups.satellites || [], chan: UI.ORBITS_TOGGLE_SATELLITES, labelKey: 'menu.toggleOrbitsSatellites' },
    { id: 'comets',     titleKey: 'menu.sectionComets',     list: groups.comets     || [], chan: UI.ORBITS_TOGGLE_COMETS,     labelKey: 'menu.toggleOrbitsComets' },
    { id: 'asteroids',  titleKey: 'menu.sectionAsteroids',  list: groups.asteroids  || [], chan: UI.ORBITS_TOGGLE_ASTEROIDS,  labelKey: 'menu.toggleOrbitsAsteroids' },
  ];

  const sectionsById = Object.create(null);
  const togglesById  = Object.create(null);
  const allItems = new Map();
  const sectionsDetach = [];

  for (const def of SECTIONS_DEF) {
    // Bouton toggle (colonne gauche)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'body-menu__toggle';
    btn.dataset.section = def.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = t(def.titleKey);
    togglesEl.appendChild(btn);
    togglesById[def.id] = btn;

    // Section pré-construite (parked dans un fragment caché jusqu'à
    // l'ouverture). Pas de remount au toggle.
    const { section, items, detach } = buildSection({
      id: def.id,
      bodies: def.list,
      orbitChannel: def.chan,
      orbitLabelKey: def.labelKey,
      dispatch,
    });
    sectionsById[def.id] = section;
    items.forEach((b, id) => allItems.set(id, b));
    sectionsDetach.push(detach);
  }

  // --- État pile -----------------------------------------------------------
  const openSections = []; // ordre = slot

  function rerenderSlots() {
    // Détacher d'abord pour permettre un re-append propre et le replay
    // de la transition CSS d'entrée.
    slots.forEach((s) => s.replaceChildren());
    openSections.forEach((sid, slotIdx) => {
      const sec = sectionsById[sid];
      sec.classList.remove('is-entering');
      slots[slotIdx].appendChild(sec);
      // Force reflow puis trigger transition d'entrée
      // eslint-disable-next-line no-unused-expressions
      sec.offsetWidth;
      sec.classList.add('is-entering');
    });
    // ARIA sync
    SECTIONS_DEF.forEach((def) => {
      const isOpen = openSections.includes(def.id);
      togglesById[def.id].setAttribute('aria-pressed', isOpen ? 'true' : 'false');
    });
    // LOT 16 round 4 — largeur conditionnelle : compact si fermé, élargi si ≥1 section ouverte.
    root.classList.toggle('body-menu--has-open-section', openSections.length > 0);
  }

  function openSection(sid) {
    if (openSections.includes(sid)) return;
    if (openSections.length >= SLOT_COUNT) return;
    openSections.push(sid);
    rerenderSlots();
  }

  function closeSection(sid) {
    const idx = openSections.indexOf(sid);
    if (idx < 0) return;
    openSections.splice(idx, 1);
    rerenderSlots();
  }

  function onTogglesClick(e) {
    const btn = e.target.closest('.body-menu__toggle');
    if (!btn) return;
    const sid = btn.dataset.section;
    if (openSections.includes(sid)) closeSection(sid);
    else openSection(sid);
  }
  togglesEl.addEventListener('click', onTogglesClick);

  root.append(togglesEl, slotsEl);

  // Sélection ARIA des items
  let selectedId = null;
  function applySelection(id) {
    if (selectedId === id) return;
    if (selectedId) allItems.get(selectedId)?.setAttribute('aria-pressed', 'false');
    selectedId = id;
    if (id) allItems.get(id)?.setAttribute('aria-pressed', 'true');
  }

  const unsubA = bus.on(UI.BODY_SELECT,       (p) => applySelection(p?.id ?? null));
  const unsubB = bus.on(ENGINE.BODY_SELECTED, (p) => applySelection(p?.id ?? null));

  // Init : toutes sections fermées
  rerenderSlots();

  container.appendChild(root);

  return {
    el: root,
    destroy() {
      clearTimeout(hoverTimer);
      togglesEl.removeEventListener('click', onTogglesClick);
      sectionsDetach.forEach((d) => d());
      unsubA(); unsubB();
      root.remove();
    },
  };
}
