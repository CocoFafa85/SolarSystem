// Bootstrap UI — orchestré par src/main.js (pas d'auto-boot ici).
// Charge l'i18n, monte tous les composants HUD, expose l'EventBus.
// N'importe AUCUN module Three.js ou physique.

import { loadLocale, hydrate } from './core/i18n.js';
import * as bus from './core/eventBus.js';
import { UI, ENGINE, EVENT_TYPES, VIEW_PRESETS } from './core/channels.js';
import { currentBreakpoint } from './core/breakpoints.js';
import { loadBodyViews } from './data/bodyView.js';

import { mountTimeControls }    from './components/TimeControls.js';
import { mountTimeStatus }      from './components/TimeStatus.js';
import { mountBodyMenu }        from './components/BodyMenu.js';
import { mountBodyInfoCard }    from './components/BodyInfoCard.js';
import { mountCompareMenu }     from './components/CompareMenu.js';
import { mountCompareOverlay }  from './components/CompareOverlay.js';
import { mountEventStats }      from './components/EventStats.js';
import { mountSolarFlareAlert } from './components/SolarFlareAlert.js';
import { mountHudToggle }       from './components/HudToggle.js';
import { mountComparatorButton} from './components/ComparatorButton.js';
import { mountComparatorPanel } from './components/ComparatorPanel.js';
import { mountEventsPanel }     from './components/EventsPanel.js';
import { mountTooltip }         from './components/Tooltip.js';
import { mountSeasonMarkerTip } from './components/SeasonMarkerTip.js';
import { mountTimeShortcuts }   from './components/TimeShortcuts.js';
import { mountBodyMenuToggle }  from './components/BodyMenuToggle.js';
import { mountOrbitHoverTip }   from './components/OrbitHoverTip.js';
import { mountGlossaryButton }  from './components/GlossaryButton.js';
import { mountGlossaryModal }   from './components/GlossaryModal.js';
import { mountWelcomeModal }    from './components/WelcomeModal.js';
import { mountCursorCustom }    from './components/CursorCustom.js';
// LOT 10 — glossaire 100 % overlay SVG : ni GlossaryAnimator ni
// GlossaryPreviewController nécessaires (plus de routage caméra).

export async function bootUI({ lang = 'fr' } = {}) {
  await loadLocale(lang);
  hydrate(document);

  const { list: bodies, byId, groups } = await loadBodyViews();

  const slots = {
    top:    document.getElementById('hud-top'),
    bottom: document.getElementById('hud-bottom'),
    left:   document.getElementById('hud-left'),
    right:  document.getElementById('hud-right'),
    app:    document.querySelector('.app'),
  };

  const components = [];

  if (slots.top) {
    components.push(mountTimeStatus(slots.top));
    // LOT 6 — bouton + panneau colocalisés. Le panneau s'étend sous le bouton.
    components.push(mountEventsPanel(slots.top));
  }
  if (slots.bottom) components.push(mountTimeControls(slots.bottom));
  // LOT 7 — BodyMenu désormais déployé par un wrapper "Astres" (toggle).
  if (slots.left)   components.push(mountBodyMenuToggle(slots.left, groups));
  if (slots.right) {
    // LOT 8 — Glossaire avant Comparer (ordre DOM = ordre visuel top-to-bottom).
    // LOT 8B — Comparator + Menu sont désormais wrappés ensemble pour que le menu
    // s'ouvre ancré directement sous le bouton trigger (popover CSS pure).
    components.push(mountGlossaryButton(slots.right));
    components.push(mountComparatorPanel(slots.right));
    components.push(mountBodyInfoCard(slots.right, byId));
  }
  if (slots.app) {
    // LOT 6 — Tooltip partagé monté EN PREMIER pour être disponible aux
    // consommateurs (TimeControls, SeasonMarkerTip).
    components.push(mountTooltip(slots.app));
    components.push(mountCompareOverlay(slots.app, bodies));
    components.push(mountSolarFlareAlert(slots.app));
    components.push(mountHudToggle(slots.app));
    components.push(mountSeasonMarkerTip());
    components.push(mountTimeShortcuts()); // LOT 6B — raccourcis clavier
    components.push(mountOrbitHoverTip((id) => byId[id]?.name));
    components.push(mountGlossaryModal(slots.app));
    // LOT 10 — modale d'accueil EN DERNIER : DOM en tête de stack visuelle,
    // s'auto-affiche si `solar.welcomeSeen` absent du localStorage.
    components.push(mountWelcomeModal(slots.app));
    // LOT 11 — curseur DOM overlay (skip auto sur mobile / pointer:coarse).
    components.push(mountCursorCustom());
  }

  let bp = currentBreakpoint();
  // Profile C — listener nommé + cleanup au destroy. Sans `removeEventListener`,
  // un nouveau handler resize était attaché à chaque cycle bootUI()/destroy() —
  // accumulation linéaire de closures retenant le scope local.
  const onResize = () => {
    const next = currentBreakpoint();
    if (next !== bp) { bp = next; bus.emit('ui:breakpoint:changed', bp); }
  };
  window.addEventListener('resize', onResize, { passive: true });

  return {
    bus,
    channels: { UI, ENGINE, EVENT_TYPES, VIEW_PRESETS },
    bodies, byId, groups,
    breakpoint: () => bp,
    destroy() {
      window.removeEventListener('resize', onResize);
      components.forEach((c) => c.destroy());
    },
  };
}

// NB : aucun auto-boot ici. `src/main.js` orchestre le démarrage (UI puis moteur 3D)
// via `await bootUI()`. Un auto-boot ici causait un double mount de tous les
// composants HUD quand `index.html` chargeait à la fois ce fichier et `main.js`.
