// CameraPresets — 3 vues prédéfinies du système solaire (LOT 5 / LOT 5B).
// Consomme `UI.VIEW_PRESET { preset }` — IDs canoniques dans VIEW_PRESETS.
//
// Presets :
//   - 'system' : plongée d'ensemble, distance pré-calculée depuis bounding
//                radius (max aphélie) du groupe. Schéma "computed".
//   - 'inner'  : contre-plongée depuis la ceinture principale d'astéroïdes
//                (~2.7 UA latéral, 0.3 UA sous l'écliptique). Schéma "direct".
//   - 'outer'  : contre-plongée depuis la ceinture de Kuiper (~50 UA latéral,
//                8 UA sous l'écliptique). Schéma "direct".
//
// Animation : snapshot from→to + smoothstep, zéro `new` dans la RAF.

import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';
import { FOCUS } from '../config/render.config.js';

// Deux schémas de presets :
//   - 'computed' : `bounding` calculé depuis le groupe ; (camY, camZ) dérivés.
//   - 'direct'   : positions caméra absolues injectées telles quelles.
const PRESET_DEFS = Object.freeze({
  system: Object.freeze({
    mode: 'computed',
    group: Object.freeze([
      'mercury','venus','earth','mars','jupiter','saturn','uranus','neptune','pluto',
    ]),
    elevationRatio: 0.4,
    backoff: 1.6,
  }),
  // LOT 5D — calibration finale par mesure utilisateur via le debug log de
  // CameraControls ('end' event throttle 250 ms). Conservé en const figées.
  inner: Object.freeze({
    mode: 'direct',
    camX: 0.015, camY: -2.177, camZ: 0.640,
    targetX: 0, targetY: 0, targetZ: 0,
  }),
  outer: Object.freeze({
    mode: 'direct',
    camX: 0.022, camY: -35.934, camZ: 4.451,
    targetX: 0, targetY: 0, targetZ: 0,
  }),
});

function smooth(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

function computeBoundingRadiusAu(data, ids) {
  let r = 0;
  for (const id of ids) {
    const body = data.bodies[id];
    if (!body?.orbital) continue;
    const a = body.orbital.semiMajorAxisAu;
    const e = body.orbital.eccentricity;
    const aphelion = a * (1 + e);
    if (aphelion > r) r = aphelion;
  }
  return r;
}

/**
 * @param {{camera: import('three').Camera, controls: any, data: object, focus?: {resetView:Function}}} deps
 */
export function createCameraPresets({ camera, controls, data, focus }) {
  if (!camera || !controls || !data) {
    throw new Error('createCameraPresets: dépendances manquantes');
  }

  // Pré-calcul des positions cibles à l'init.
  // Schéma uniforme retourné : { targetX/Y/Z, camX/Y/Z }.
  const presets = new Map();
  for (const [id, def] of Object.entries(PRESET_DEFS)) {
    if (def.mode === 'computed') {
      const boundingAu = computeBoundingRadiusAu(data, def.group);
      presets.set(id, {
        targetX: 0, targetY: 0, targetZ: 0,
        camX: 0,
        camY: boundingAu * def.elevationRatio,
        camZ: boundingAu * def.backoff,
      });
    } else {
      // mode 'direct'
      presets.set(id, {
        targetX: def.targetX, targetY: def.targetY, targetZ: def.targetZ,
        camX: def.camX,       camY: def.camY,       camZ: def.camZ,
      });
    }
  }

  const state = {
    active: false, elapsed: 0, duration: FOCUS.LERP_DURATION_SEC,
    fromTx: 0, fromTy: 0, fromTz: 0,
    fromCx: 0, fromCy: 0, fromCz: 0,
    toTx: 0,   toTy: 0,   toTz: 0,
    toCx: 0,   toCy: 0,   toCz: 0,
  };

  function applyPresetInternal(presetId, { clearFocus }) {
    const p = presets.get(presetId);
    if (!p) { console.warn('[cameraPresets] preset inconnu:', presetId); return; }
    if (clearFocus) {
      // Casser tout follow/preview actif du focusController.
      focus?.resetView?.();
    }

    state.fromTx = controls.target.x;
    state.fromTy = controls.target.y;
    state.fromTz = controls.target.z;
    state.fromCx = camera.position.x;
    state.fromCy = camera.position.y;
    state.fromCz = camera.position.z;
    state.toTx = p.targetX; state.toTy = p.targetY; state.toTz = p.targetZ;
    state.toCx = p.camX;    state.toCy = p.camY;    state.toCz = p.camZ;
    state.elapsed = 0;
    state.active = true;
  }

  // Canal officiel : { preset: 'system'|'inner'|'outer' }.
  const unsub = bus.on(UI.VIEW_PRESET, (payload) => {
    const id = payload?.preset ?? payload?.id;
    if (id) applyPreset(id);
  });

  function tick(dt) {
    if (!state.active) return;
    state.elapsed += dt;
    const k = smooth(state.elapsed / state.duration);
    controls.target.set(
      state.fromTx + (state.toTx - state.fromTx) * k,
      state.fromTy + (state.toTy - state.fromTy) * k,
      state.fromTz + (state.toTz - state.fromTz) * k,
    );
    camera.position.set(
      state.fromCx + (state.toCx - state.fromCx) * k,
      state.fromCy + (state.toCy - state.fromCy) * k,
      state.fromCz + (state.toCz - state.fromCz) * k,
    );
    if (state.elapsed >= state.duration) state.active = false;
  }

  function applyPreset(presetId) {
    applyPresetInternal(presetId, { clearFocus: true });
  }

  // LOT 8C — preview glossaire : applique un preset SANS écraser le lock
  // ni la preview-session courante du focusController (le caller a
  // déjà snapshoté via beginPreviewSession()).
  function applyPresetPreview(presetId) {
    applyPresetInternal(presetId, { clearFocus: false });
  }

  return {
    tick,
    applyPreset,
    applyPresetPreview,
    presets,
    destroy() { unsub(); state.active = false; },
  };
}
