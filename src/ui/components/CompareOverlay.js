// CompareOverlay — modal de comparaison classée.
// Fermeture : bouton ×, Escape, clic sur le backdrop, UI.COMPARE_HIDE.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { t } from '../core/i18n.js';
import { sortByMetric, metricValue } from '../data/bodyView.js';

// LOT 7 — Comparaisons interactives : ratio A↔B + faits "humoristiques".
// Données chargées une seule fois, partagées entre toutes les ouvertures.
let _comparisons = null;
async function loadComparisons() {
  if (_comparisons) return _comparisons;
  try {
    const res = await fetch('data/comparisons.fr.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _comparisons = await res.json();
  } catch (err) {
    console.warn('[CompareOverlay] comparisons unavailable', err);
    _comparisons = {};
  }
  return _comparisons;
}

function metricNumber(vm, metric) {
  switch (metric) {
    case 'mass':          return vm.physical.massKg;
    case 'size':          return vm.physical.radiusKm;
    case 'temp':          return vm.derived.tempMaxK;
    case 'orbitalSpeed':  return vm.derived.orbitalSpeedKmS;
    case 'rotationSpeed': return Math.abs(vm.physical.rotationPeriodHours);
    default: return NaN;
  }
}
function formatRatio(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return '—';
  const r = a / b;
  if (r >= 1) return `${r.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}×`;
  return `1 / ${(1 / r).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`;
}

export function mountCompareOverlay(container, bodies) {
  if (!container) throw new Error('CompareOverlay: container manquant');

  const backdrop = document.createElement('div');
  backdrop.className = 'compare-overlay';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'compare-title');
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'compare-overlay__modal panel';

  const header = document.createElement('header');
  header.className = 'compare-overlay__header';
  const title = document.createElement('h2'); title.id = 'compare-title'; title.className = 'compare-overlay__title';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'compare-overlay__close';
  close.setAttribute('aria-label', t('common.close'));
  close.textContent = '×';
  header.append(title, close);

  // --- Section ratio A ↔ B (LOT 7) ---------------------------------------
  const ratioBox = document.createElement('div');
  ratioBox.className = 'compare-ratio';

  function makeSelect() {
    const sel = document.createElement('select');
    sel.className = 'compare-ratio__select';
    bodies.forEach((vm) => {
      const opt = document.createElement('option');
      opt.value = vm.id;
      opt.textContent = vm.name;
      sel.appendChild(opt);
    });
    return sel;
  }
  const selA = makeSelect();
  const selB = makeSelect();
  selA.setAttribute('aria-label', t('compare.bodyA'));
  selB.setAttribute('aria-label', t('compare.bodyB'));

  const ratioOut = document.createElement('output');
  ratioOut.className = 'compare-ratio__out';

  ratioBox.append(
    Object.assign(document.createElement('label'), { className: 'compare-ratio__label', textContent: 'A' }),
    selA,
    Object.assign(document.createElement('span'),  { className: 'compare-ratio__sep',   textContent: '↔' }),
    Object.assign(document.createElement('label'), { className: 'compare-ratio__label', textContent: 'B' }),
    selB,
    ratioOut,
  );

  // --- Faits ordres de grandeur (LOT 7) ----------------------------------
  const factsBox = document.createElement('ul');
  factsBox.className = 'compare-facts';

  const tableWrap = document.createElement('div');
  tableWrap.className = 'compare-overlay__list';

  modal.append(header, ratioBox, factsBox, tableWrap);
  backdrop.appendChild(modal);
  container.appendChild(backdrop);

  // État courant (métrique active pour les sélecteurs + faits).
  let currentMetric = null;
  function recomputeRatio() {
    if (!currentMetric) return;
    const a = bodies.find((v) => v.id === selA.value);
    const b = bodies.find((v) => v.id === selB.value);
    if (!a || !b) { ratioOut.textContent = ''; return; }
    const na = metricNumber(a, currentMetric);
    const nb = metricNumber(b, currentMetric);
    ratioOut.textContent = `${a.name} / ${b.name} = ${formatRatio(na, nb)}`;
  }
  selA.addEventListener('change', recomputeRatio);
  selB.addEventListener('change', recomputeRatio);

  function hide() { backdrop.hidden = true; }
  close.addEventListener('click', () => bus.emit(UI.COMPARE_HIDE, null));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) bus.emit(UI.COMPARE_HIDE, null); });
  document.addEventListener('keydown', (e) => { if (!backdrop.hidden && e.key === 'Escape') bus.emit(UI.COMPARE_HIDE, null); });

  async function show(metric) {
    currentMetric = metric;
    title.textContent = t(`compare.metric.${metric}`);
    const sorted = sortByMetric(bodies, metric);

    // Préfixer les sélecteurs sur les deux premiers du classement.
    if (sorted[0]) selA.value = sorted[0].id;
    if (sorted[1]) selB.value = sorted[1].id;
    recomputeRatio();

    // Faits — chargement paresseux partagé.
    const cmp = await loadComparisons();
    const facts = cmp?.[metric]?.facts || [];
    factsBox.replaceChildren(...facts.map((f) => {
      const li = document.createElement('li');
      li.className = 'compare-facts__item';
      li.textContent = f;
      return li;
    }));

    const frag = document.createDocumentFragment();
    sorted.forEach((vm, idx) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'compare-row';
      row.style.setProperty('--accent', vm.accent);
      row.innerHTML = `
        <span class="compare-row__rank">${idx + 1}</span>
        <span class="compare-row__dot" aria-hidden="true"></span>
        <span class="compare-row__name">${vm.name}</span>
        <span class="compare-row__value">${metricValue(vm, metric)}</span>
      `;
      row.addEventListener('click', () => {
        bus.emit(UI.BODY_SELECT, { id: vm.id });
        bus.emit(UI.VIEW_FOCUS,  { id: vm.id });
        bus.emit(UI.COMPARE_HIDE, null);
      });
      frag.appendChild(row);
    });

    tableWrap.replaceChildren(frag);
    backdrop.hidden = false;
    // Focus initial sur le bouton close pour l'accessibilité clavier.
    close.focus();
  }

  const unsubShow = bus.on(UI.COMPARE_SHOW, (p = {}) => p.metric && show(p.metric));
  const unsubHide = bus.on(UI.COMPARE_HIDE, hide);

  return {
    el: backdrop,
    destroy() { unsubShow(); unsubHide(); backdrop.remove(); },
  };
}
