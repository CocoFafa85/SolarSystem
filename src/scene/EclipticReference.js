import * as THREE from 'three';
import { ECLIPTIC } from '../config/render.config.js';

// Repère écliptique — devenu OPT-IN (LOT 5).
// Les helpers (grid + axes) étaient visibles par défaut et apparaissaient à
// l'écran comme "axes parasites et diamètres fins ne correspondant à aucun astre".
// Désormais masqués sauf si `{ showGrid:true, showAxes:true }` est passé.
// La fonction reste exportée pour le mode debug Profile B/C.

export function createEclipticReference({ showGrid = false, showAxes = false } = {}) {
  const group = new THREE.Group();
  group.name = 'EclipticReference';

  if (showGrid) {
    const grid = new THREE.PolarGridHelper(
      ECLIPTIC.GRID_RADIUS_AU,
      ECLIPTIC.GRID_DIVISIONS,
      ECLIPTIC.GRID_DIVISIONS,
      64,
      ECLIPTIC.GRID_COLOR,
      ECLIPTIC.GRID_COLOR,
    );
    grid.rotation.x = Math.PI / 2;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    group.add(grid);
  }

  if (showAxes) {
    const axes = new THREE.AxesHelper(ECLIPTIC.AXIS_LENGTH_AU);
    axes.material.transparent = true;
    axes.material.opacity = 0.6;
    group.add(axes);
  }

  return group;
}
