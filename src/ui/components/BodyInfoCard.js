// BodyInfoCard — fiche d'informations détaillée du corps sélectionné (HUD right).
// S'abonne à UI.BODY_SELECT (action utilisateur) et ENGINE.BODY_SELECTED (focus moteur).

import * as bus from '../core/eventBus.js';
import { UI, ENGINE } from '../core/channels.js';
import { t } from '../core/i18n.js';
import {
  formatMass, formatRadiusKm, formatRotationPeriod,
  formatOrbitalPeriod, formatKmS, formatTempRange,
} from '../data/bodyView.js';

function row(labelKey, value) {
  const dt = document.createElement('dt'); dt.textContent = t(labelKey);
  const dd = document.createElement('dd'); dd.textContent = value;
  return [dt, dd];
}

export function mountBodyInfoCard(container, bodiesById) {
  if (!container) throw new Error('BodyInfoCard: container manquant');

  const root = document.createElement('article');
  root.className = 'body-card panel';
  root.setAttribute('aria-label', t('hud.rightLabel'));
  root.setAttribute('aria-live', 'polite');
  root.hidden = true;

  const header = document.createElement('header');
  header.className = 'body-card__header';
  const accent = document.createElement('span'); accent.className = 'body-card__accent'; accent.setAttribute('aria-hidden', 'true');
  const title  = document.createElement('h2');   title.className  = 'body-card__title';
  const close  = document.createElement('button');
  close.type = 'button';
  close.className = 'body-card__close';
  close.setAttribute('aria-label', t('common.close'));
  close.textContent = '×';
  close.addEventListener('click', () => bus.emit(UI.PANEL_CLOSE, { panel: 'bodyCard' }));
  header.append(accent, title, close);

  const desc = document.createElement('p'); desc.className = 'body-card__desc';
  const discovery = document.createElement('small'); discovery.className = 'body-card__discovery';
  const dl   = document.createElement('dl'); dl.className   = 'body-card__grid';

  root.append(header, desc, discovery, dl);
  container.appendChild(root);

  function render(vm) {
    if (!vm) { root.hidden = true; return; }
    root.hidden = false;
    root.style.setProperty('--accent', vm.accent);
    title.textContent = vm.name;
    desc.textContent = vm.descKey ? t(vm.descKey) : '';
    desc.hidden = !desc.textContent || desc.textContent === vm.descKey;

    // LOT 16 #10 — dates de découverte + reclassification dwarf.
    const lines = [];
    if (vm.discoveredYear === 'Antiquité' || vm.discoveredYear == null) {
      if (vm.discoveredYear === 'Antiquité') lines.push(t('bodyCard.discoveredInAntiquity'));
    } else {
      lines.push(t('bodyCard.discoveredIn', { year: vm.discoveredYear }));
    }
    if (vm.dwarfClassifiedYear) {
      lines.push(t('bodyCard.dwarfClassifiedIn', { year: vm.dwarfClassifiedYear }));
    }
    discovery.textContent = lines.join(' · ');
    discovery.hidden = lines.length === 0;

    // LOT 16 #9 — grid masquée pour les comètes (données physiques peu pertinentes).
    const isComet = vm.type === 'comet' || vm.category === 'comet';
    dl.hidden = isComet;
    if (isComet) { dl.replaceChildren(); return; }

    dl.replaceChildren(
      ...row('bodyCard.type',          t(`bodyType.${vm.type}`)),
      ...row('bodyCard.mass',          formatMass(vm.physical.massKg)),
      ...row('bodyCard.radius',        formatRadiusKm(vm.physical.radiusKm)),
      ...row('bodyCard.rotation',      formatRotationPeriod(vm.physical.rotationPeriodHours)),
      ...row('bodyCard.obliquity',     `${vm.physical.obliquityDeg?.toFixed?.(2) ?? '—'}°`),
      ...row('bodyCard.orbitalPeriod', vm.orbital ? formatOrbitalPeriod(vm.orbital.orbitalPeriodHours) : '—'),
      ...row('bodyCard.orbitalSpeed',  formatKmS(vm.derived.orbitalSpeedKmS)),
      ...row('bodyCard.temperature',   formatTempRange(vm.derived.tempMinK, vm.derived.tempMaxK)),
    );
  }

  function show(id) { render(bodiesById[id] || null); }

  const unsubA = bus.on(UI.BODY_SELECT,        (p) => show(p?.id));
  const unsubB = bus.on(ENGINE.BODY_SELECTED,  (p) => show(p?.id));
  const unsubC = bus.on(UI.PANEL_CLOSE,        (p) => { if (!p || p.panel === 'bodyCard') { root.hidden = true; } });

  return {
    el: root,
    destroy() { unsubA(); unsubB(); unsubC(); root.remove(); },
  };
}
