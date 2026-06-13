// SeasonMarkerTip (LOT 6) — consomme UI.MARKER_HOVER émis par le moteur
// (raycaster équinoxes/solstices throttlé côté A) et utilise le Tooltip
// partagé pour afficher un mini libellé i18n centré sur le pointeur.
//
// Payload attendu : { id, x?, y? } — x/y en pixels écran si fournis,
// sinon on cache simplement le tooltip si id === null.

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { t } from '../core/i18n.js';
import { getTooltip } from './Tooltip.js';

const VALID_IDS = new Set([
  'vernalEquinox', 'summerSolstice', 'autumnalEquinox', 'winterSolstice',
]);

// Defensive fallback FR : utilisé si i18n n'est pas chargé au moment de
// l'événement (race possible avec bootUI ou cache navigateur stale).
// Garantit que l'utilisateur voit "Équinoxe de printemps" et jamais
// "markers.vernalEquinox" même en cas d'échec i18n.
const FALLBACK_FR = {
  vernalEquinox:   'Équinoxe de printemps',
  summerSolstice:  "Solstice d'été",
  autumnalEquinox: "Équinoxe d'automne",
  winterSolstice:  "Solstice d'hiver",
};

export function mountSeasonMarkerTip() {
  const unsub = bus.on(UI.MARKER_HOVER, (payload = {}) => {
    const tip = getTooltip();
    if (!tip) return;
    if (!payload.id || !VALID_IDS.has(payload.id)) {
      tip.hide();
      return;
    }
    const key = `markers.${payload.id}`;
    let text = t(key);
    // `t()` retourne la clé brute en cas de miss → fallback FR explicite.
    if (text === key) text = FALLBACK_FR[payload.id] ?? payload.id;
    if (Number.isFinite(payload.x) && Number.isFinite(payload.y)) {
      tip.showAt(payload.x, payload.y, text);
    } else {
      // Affichage central haut si le moteur n'envoie pas de coords.
      tip.showAt(window.innerWidth / 2, 24, text, { anchor: 'bottom' });
    }
  });

  return { destroy() { unsub(); } };
}
