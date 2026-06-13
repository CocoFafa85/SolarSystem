// TimeStatus — LOT 5 : affichage principal = ANNÉE CIVILE.
// Le détail (vitesse, état, heures, jours, années écoulées) n'apparaît
// qu'au survol/focus via un tooltip dépliable. Lecture seule.

import * as bus from '../core/eventBus.js';
import { ENGINE } from '../core/channels.js';
import { t } from '../core/i18n.js';
import {
  elapsedHoursToCivilDate, formatCivilYear, formatCivilDate, DEFAULT_SIM_EPOCH_ISO,
} from '../data/bodyView.js';

function row(labelKey, valueClass) {
  const dt = document.createElement('dt'); dt.textContent = t(labelKey);
  const dd = document.createElement('dd'); dd.className = valueClass; dd.textContent = '—';
  return [dt, dd];
}

export function mountTimeStatus(container, { epochISO = DEFAULT_SIM_EPOCH_ISO } = {}) {
  if (!container) throw new Error('TimeStatus: container manquant');

  const root = document.createElement('section');
  root.className = 'time-status panel';
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('aria-atomic', 'true');
  root.setAttribute('tabindex', '0'); // focusable au clavier pour révéler les détails

  // Vue principale : année civile
  const main = document.createElement('div');
  main.className = 'time-status__main';
  const year = document.createElement('span');
  year.className = 'time-status__year';
  year.textContent = '—';
  const subtitle = document.createElement('span');
  subtitle.className = 'time-status__subtitle';
  subtitle.textContent = t('time.civilDate');
  main.append(year, subtitle);

  // Détails — repliés par défaut. LOT 6 : "État" et "Vitesse" déplacés en
  // tooltips dans TimeControls. On garde la date civile + 3 unités écoulées.
  const details = document.createElement('dl');
  details.className = 'time-status__details';
  const [dateLbl, dateVal]      = row('time.dateLabel',    'time-status__value');
  const [hoursLbl, hoursVal]    = row('time.elapsedHours', 'time-status__value');
  const [daysLbl, daysVal]      = row('time.elapsedDays',  'time-status__value');
  const [yearsLbl, yearsVal]    = row('time.elapsedYears', 'time-status__value');
  details.append(dateLbl, dateVal, hoursLbl, hoursVal, daysLbl, daysVal, yearsLbl, yearsVal);

  root.append(main, details);
  container.appendChild(root);

  let lastWrite = 0;
  let lastElapsed = 0;
  let lastPaused = false;
  const MIN_INTERVAL_MS = 150;

  const unsub = bus.on(ENGINE.TIME_CHANGED, (payload = {}) => {
    const now = performance.now();
    const { paused, elapsedHours } = payload;
    // LOT 9 — bypass throttle quand reset (elapsedHours décroît) ou
    // changement d'état pause : sinon la frame "reset" se fait avaler par
    // une émission RAF antérieure de <150 ms.
    const force = (Number.isFinite(elapsedHours) && elapsedHours < lastElapsed) || (!!paused !== lastPaused);
    if (!force && now - lastWrite < MIN_INTERVAL_MS) return;
    lastWrite = now;
    if (Number.isFinite(elapsedHours)) lastElapsed = elapsedHours;
    lastPaused = !!paused;

    const civilEpoch = payload.epochISO || epochISO;
    const date = elapsedHoursToCivilDate(elapsedHours, civilEpoch);

    year.textContent = formatCivilYear(date);
    year.classList.toggle('is-paused', !!paused);

    dateVal.textContent  = formatCivilDate(date);

    if (Number.isFinite(elapsedHours)) {
      hoursVal.textContent = `${Math.floor(elapsedHours).toLocaleString('fr-FR')} ${t('time.unitHour')}`;
      daysVal.textContent  = `${Math.floor(elapsedHours / 24).toLocaleString('fr-FR')} ${t('time.unitDay')}`;
      yearsVal.textContent = `${(elapsedHours / 8760).toFixed(2)} ${t('time.unitYear')}`;
    }
  });

  return {
    el: root,
    destroy() { unsub(); root.remove(); },
  };
}
