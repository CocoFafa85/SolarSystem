// SolarFlareAlert — couche UI de l'événement "Éruption solaire massive".
// La partie 3D (particules, plasma) reste sous responsabilité Profile B.
// Ici : bannière d'alerte + flash plein écran respectant prefers-reduced-motion.

import * as bus from '../core/eventBus.js';
import { ENGINE } from '../core/channels.js';
import { t } from '../core/i18n.js';

const FLASH_MS = 1600;

export function mountSolarFlareAlert(container) {
  if (!container) throw new Error('SolarFlareAlert: container manquant');

  const flash = document.createElement('div');
  flash.className = 'flare-flash';
  flash.setAttribute('aria-hidden', 'true');

  const banner = document.createElement('div');
  banner.className = 'flare-banner';
  banner.setAttribute('role', 'status');           // alerte non-bloquante
  banner.setAttribute('aria-live', 'polite');
  banner.hidden = true;

  const icon = document.createElement('span'); icon.className = 'flare-banner__icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = '☀';
  const txt  = document.createElement('span'); txt.className = 'flare-banner__text';

  banner.append(icon, txt);
  container.append(flash, banner);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let flashTimer = 0;

  function triggerFlash() {
    if (reducedMotion.matches) return; // accessibilité : pas d'animation forte
    flash.classList.remove('is-active');
    // Force reflow pour relancer l'animation si rapproché.
    void flash.offsetWidth; // eslint-disable-line no-unused-expressions
    flash.classList.add('is-active');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => flash.classList.remove('is-active'), FLASH_MS);
  }

  function start(payload = {}) {
    const intensity = Number.isFinite(payload.intensity) ? payload.intensity : 1;
    txt.textContent = t('events.flare.alert');
    banner.style.setProperty('--flare-intensity', String(Math.max(0, Math.min(1, intensity))));
    banner.hidden = false;
    triggerFlash();
  }

  function end() {
    banner.hidden = true;
  }

  const unsubStart = bus.on(ENGINE.SOLAR_FLARE_START, start);
  const unsubEnd   = bus.on(ENGINE.SOLAR_FLARE_END,   end);

  return {
    el: banner,
    destroy() {
      unsubStart(); unsubEnd();
      clearTimeout(flashTimer);
      flash.remove(); banner.remove();
    },
  };
}
