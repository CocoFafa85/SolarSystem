// ComparatorPanel (LOT 8B) — wrapper colocalisant ComparatorButton et
// CompareMenu pour que le menu s'ouvre EN DESSOUS du bouton trigger.
// Approche CSS pure (préférée par PLAN) : wrapper `position: relative`,
// menu `position: absolute; top: 100%; right: 0`. Aucun listener resize.

import { mountComparatorButton } from './ComparatorButton.js';
import { mountCompareMenu }      from './CompareMenu.js';

export function mountComparatorPanel(container) {
  if (!container) throw new Error('ComparatorPanel: container manquant');

  const wrap = document.createElement('div');
  wrap.className = 'comparator-wrapper';
  container.appendChild(wrap);

  const btn  = mountComparatorButton(wrap);
  const menu = mountCompareMenu(wrap);

  return {
    el: wrap,
    destroy() { menu.destroy(); btn.destroy(); wrap.remove(); },
  };
}
