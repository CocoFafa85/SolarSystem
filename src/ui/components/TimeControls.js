// TimeControls — barre de contrôle du moteur du temps.
// LOT 5 : ordre Reset · Play · 1/2× · 1× · 2× · PoV. Émet uniquement des UI.*.
// L'état pause provient d'ENGINE.TIME_CHANGED — aucun état local.

import * as bus from '../core/eventBus.js';
import { UI, ENGINE } from '../core/channels.js';
import { t } from '../core/i18n.js';
import { mountPoVMenu } from './PoVMenu.js';
import { getTooltip } from './Tooltip.js';

// LOT 6B — Play n'a plus de tooltip. Seuls les 3 boutons vitesse en reçoivent,
// avec la MÊME valeur (vitesse courante de la simulation).
const SPEED_TIP_KINDS = new Set(['slower', 'normal', 'faster']);

function formatSpeedLabel(speed) {
  if (!Number.isFinite(speed)) return '—×';
  const abs = Math.abs(speed);
  if (abs >= 100) return `${speed.toFixed(0)}×`;
  if (abs >= 1)   return `${speed.toFixed(speed % 1 === 0 ? 0 : 1)}×`;
  if (abs > 0)    return `${speed.toFixed(2)}×`;
  return '0×';
}

const SPEED_STEP = 2;

function makeButton({ label, ariaKey, title, onClick, variant = '' }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `tc__btn ${variant}`.trim();
  btn.setAttribute('aria-label', t(ariaKey));
  if (title !== false) btn.title = t(ariaKey);
  btn.textContent = label;
  btn.addEventListener('click', (e) => { e.preventDefault(); onClick(); });
  return btn;
}

export function mountTimeControls(container) {
  if (!container) throw new Error('TimeControls: container manquant');

  const root = document.createElement('div');
  root.className = 'time-controls panel';
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', t('hud.bottomLabel'));

  const reset = makeButton({
    label: '⟲',
    ariaKey: 'time.resetToZero',
    onClick: () => bus.emit(UI.TIME_RESET, null),
  });

  const toggle = makeButton({
    label: '⏯',
    ariaKey: 'time.toggle',
    variant: 'tc__btn--primary',
    onClick: () => bus.emit(UI.TIME_TOGGLE, null),
  });
  // LOT 6B — pas de tooltip sur Play/Pause.
  toggle.setAttribute('aria-pressed', 'false');

  const slower = makeButton({
    label: '½×',
    ariaKey: 'time.slower',
    onClick: () => bus.emit(UI.TIME_STEP_SPEED, { factor: 1 / SPEED_STEP }),
  });
  slower.dataset.tip = 'slower';

  const normal = makeButton({
    label: '1×',
    ariaKey: 'time.reset',
    onClick: () => bus.emit(UI.TIME_SET_SPEED, { speed: 1 }),
  });
  normal.dataset.tip = 'normal';

  const faster = makeButton({
    label: '2×',
    ariaKey: 'time.faster',
    onClick: () => bus.emit(UI.TIME_STEP_SPEED, { factor: SPEED_STEP }),
  });
  faster.dataset.tip = 'faster';

  // Ordre LOT 5 : Reset, Play, 1/2×, 1×, 2×
  root.append(reset, toggle, slower, normal, faster);

  // --- PoV dropdown (LOT 5) -----------------------------------------------
  const pov = mountPoVMenu(root);

  // LOT 9 — Bouton "Caméra sur Soleil" placé APRÈS PoV. Réutilise UI.VIEW_FOCUS.
  const sunFocus = document.createElement('button');
  sunFocus.type = 'button';
  sunFocus.className = 'tc__btn sun-focus__trigger';
  sunFocus.setAttribute('aria-label', t('time.focusSun'));
  sunFocus.title = t('time.focusSunTitle');
  sunFocus.innerHTML = '<span aria-hidden="true">✸</span>';
  sunFocus.addEventListener('click', (e) => {
    e.preventDefault();
    // LOT 12 (révision) — preset fixe 'sun' (coords calibrées par l'utilisateur)
    // au lieu de VIEW_FOCUS body-relatif. Évite la dépendance à visualRadius
    // (qui à 1:1 produit une distance trop faible pour cadrer le Soleil).
    bus.emit(UI.VIEW_PRESET, { preset: 'sun' });
  });
  root.appendChild(sunFocus);

  container.appendChild(root);

  // LOT 6B — un SEUL abonnement ENGINE.TIME_CHANGED qui sert à :
  //   1. mettre à jour le bouton Play/Pause,
  //   2. cacher la string "vitesse courante" pour les tooltips ½×/1×/2×.
  // Contrat C : pas un abonnement par bouton ; pas d'alloc par mousemove
  // (le label est déjà calculé quand on l'affiche).
  let currentSpeedLabel = '1×';
  const unsub = bus.on(ENGINE.TIME_CHANGED, (payload = {}) => {
    const paused = !!payload.paused;
    toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
    toggle.classList.toggle('is-paused', paused);
    toggle.textContent = paused ? '▶' : '⏸';
    currentSpeedLabel = formatSpeedLabel(payload.speed);
  });

  // --- Tooltips délégués (LOT 6/6B) --------------------------------------
  function targetTip(target) {
    const el = target?.closest?.('[data-tip]');
    return el ? { el, kind: el.dataset.tip } : null;
  }
  function onOver(e) {
    const hit = targetTip(e.target);
    if (!hit) return;
    const tip = getTooltip();
    if (!tip) return;
    // LOT 6B : seuls les boutons vitesse ont un tooltip, et leur label
    // est la vitesse courante de la simulation.
    if (SPEED_TIP_KINDS.has(hit.kind)) tip.showFor(hit.el, currentSpeedLabel);
  }
  function onOut(e) {
    const hit = targetTip(e.target);
    if (!hit) return;
    const rt = e.relatedTarget;
    if (rt && hit.el.contains(rt)) return;
    getTooltip()?.hide();
  }
  root.addEventListener('mouseover', onOver);
  root.addEventListener('mouseout',  onOut);
  root.addEventListener('focusin',   onOver);
  root.addEventListener('focusout',  onOut);

  return {
    el: root,
    destroy() {
      unsub();
      pov.destroy();
      root.removeEventListener('mouseover', onOver);
      root.removeEventListener('mouseout',  onOut);
      root.removeEventListener('focusin',   onOver);
      root.removeEventListener('focusout',  onOut);
      root.remove();
    },
  };
}
