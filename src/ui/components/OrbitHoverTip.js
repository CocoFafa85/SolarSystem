// OrbitHoverTip (LOT 7) — consomme UI.ORBIT_HOVER (émis par le raycaster
// d'OrbitHoverAnchors côté Session A) et affiche le nom de l'astre via
// le Tooltip partagé (singleton — Contrat C #6 LOT 6).

import * as bus from '../core/eventBus.js';
import { UI } from '../core/channels.js';
import { getTooltip } from './Tooltip.js';

export function mountOrbitHoverTip(getByIdName) {
  // getByIdName est une fn (id) => string : renvoie le nom localisé du corps,
  // injectée par le bootstrap (qui dispose déjà du `byId` chargé).
  const unsub = bus.on(UI.ORBIT_HOVER, (payload = {}) => {
    const tip = getTooltip();
    if (!tip) return;
    if (!payload.id) { tip.hide(); return; }
    const text = getByIdName(payload.id) || payload.id;
    if (Number.isFinite(payload.x) && Number.isFinite(payload.y)) {
      tip.showAt(payload.x, payload.y, text);
    } else {
      tip.showAt(window.innerWidth / 2, 24, text, { anchor: 'bottom' });
    }
  });
  return { destroy() { unsub(); } };
}
