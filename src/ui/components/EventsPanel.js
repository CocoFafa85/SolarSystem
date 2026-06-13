// EventsPanel (LOT 6) — wrapper qui colocalise le bouton "Événements" et le
// panneau EventStats dans une même zone DOM. Le panneau s'étend verticalement
// SOUS le bouton, dans le même conteneur, plutôt que d'apparaître ailleurs.
//
// Pourquoi un wrapper et pas <details> natif ? On garde EventStats et son
// abonnement bus indépendants ; le wrapper ne fait que le re-parenter.
// Le toggle reste piloté par UI.EVENTS_TOGGLE (compatibilité LOT 5D).
//
// CONTRAT PROFILE C LOT 5B #2 — Aucun remount. Le DOM EventStats est créé
// une seule fois ; le panneau n'est ni détruit ni recréé au toggle.

import { mountEventsButton } from './EventsButton.js';
import { mountEventStats }   from './EventStats.js';

export function mountEventsPanel(container) {
  if (!container) throw new Error('EventsPanel: container manquant');

  const wrap = document.createElement('div');
  wrap.className = 'events-panel';
  container.appendChild(wrap);

  // Bouton ET panneau dans le même <div.events-panel> — extension verticale
  // naturelle. EventsButton garde son listener click → UI.EVENTS_TOGGLE.
  const btn   = mountEventsButton(wrap);
  const stats = mountEventStats(wrap); // monté une fois, `hidden` par défaut

  return {
    el: wrap,
    destroy() { stats.destroy(); btn.destroy(); wrap.remove(); },
  };
}
