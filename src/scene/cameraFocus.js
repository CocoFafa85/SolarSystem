// CameraFocusController — abonné aux canaux UI.VIEW_FOCUS / UI.VIEW_RESET / UI.VIEW_HOVER.
//
// Stratégies :
//   - FOCUS (clic)   : interpole vers le body + verrouille `lastLockedId`.
//   - HOVER (survol) : interpole vers le body en MODE PREVIEW — ne touche PAS
//                      `lastLockedId`. À la sortie du survol (id === null) :
//                        * si lastLockedId existe → on revient dessus
//                        * sinon → resetView()
//   - RESET          : interpole vers (0,0,0) + position caméra initiale,
//                      efface `lastLockedId` et `followId`.
//
// Zéro-allocation : toutes les Vector3 temporaires viennent de pool.v3.*.
// Le state d'animation est en scalaires Float64 — aucun `new` dans la RAF.

import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';
import { v3 } from '../core/pool.js';
import { CAMERA, FOCUS } from '../config/render.config.js';

// Easing : smoothstep (C¹) — évite l'à-coup d'arrivée d'un lerp linéaire.
function smooth(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/**
 * @param {{camera: import('three').Camera, controls: any, bodies: Map<string, import('three').Group>}} deps
 */
export function createCameraFocusController({ camera, controls, bodies }) {
  if (!camera || !controls || !bodies) {
    throw new Error('createCameraFocusController: dépendances manquantes');
  }

  const state = {
    active: false,
    elapsed: 0,
    duration: FOCUS.LERP_DURATION_SEC,
    fromTx: 0, fromTy: 0, fromTz: 0,
    fromCx: 0, fromCy: 0, fromCz: 0,
    toTx: 0,   toTy: 0,   toTz: 0,
    toCx: 0,   toCy: 0,   toCz: 0,
    followId: null,         // body suivi en mode follow (lock OU preview)
  };

  // LOT 5B : distinction lock / preview.
  //   - lastLockedId : id verrouillé par un clic (UI.VIEW_FOCUS).
  //   - isPreviewing : true quand on suit un hover sans avoir cliqué.
  // resetView() + UI.VIEW_FOCUS sont les SEULES sources de vérité du lock.
  let lastLockedId = null;
  let isPreviewing = false;

  function snapshotSource() {
    state.fromTx = controls.target.x;
    state.fromTy = controls.target.y;
    state.fromTz = controls.target.z;
    state.fromCx = camera.position.x;
    state.fromCy = camera.position.y;
    state.fromCz = camera.position.z;
  }

  /**
   * Anime la caméra vers `id` et active le follow-mode. NE TOUCHE PAS
   * à `lastLockedId` — c'est la responsabilité du handler appelant.
   */
  function focusOnBody(id) {
    const node = bodies.get(id);
    if (!node) {
      console.warn('[cameraFocus] body inconnu:', id);
      return;
    }

    const worldPos = node.getWorldPosition(v3.a);

    const r = node.userData?.visualRadius ?? FOCUS.MIN_TARGET_DISTANCE;
    const mult = node.userData?.id === 'sun'
      ? FOCUS.STAR_DISTANCE_MULTIPLIER
      : FOCUS.DISTANCE_MULTIPLIER;
    const dist = Math.max(r * mult, FOCUS.MIN_TARGET_DISTANCE);

    const dir = v3.b.copy(camera.position).sub(controls.target);
    if (dir.lengthSq() < 1e-12) dir.set(0, 0, 1);
    dir.normalize().multiplyScalar(dist);

    snapshotSource();
    state.toTx = worldPos.x; state.toTy = worldPos.y; state.toTz = worldPos.z;
    state.toCx = worldPos.x + dir.x;
    state.toCy = worldPos.y + dir.y;
    state.toCz = worldPos.z + dir.z;
    state.elapsed = 0;
    state.active = true;
    state.followId = id;
  }

  function resetView() {
    snapshotSource();
    state.toTx = 0; state.toTy = 0; state.toTz = 0;
    state.toCx = CAMERA.initialPosition.x;
    state.toCy = CAMERA.initialPosition.y;
    state.toCz = CAMERA.initialPosition.z;
    state.elapsed = 0;
    state.active = true;
    state.followId = null;
    lastLockedId = null;
    isPreviewing = false;
  }

  // -------------------------------------------------------------------------
  // LOT 8C — session preview glossaire.
  // beginPreviewSession() snapshot {camPos, target, lastLockedId} ; les survols
  // de termes appellent previewBody(id) qui anime SANS toucher lastLockedId.
  // endPreviewSession() restaure : lock prioritaire, sinon snapshot caméra libre.
  // -------------------------------------------------------------------------
  const previewSession = {
    active: false,
    camX: 0, camY: 0, camZ: 0,
    tgtX: 0, tgtY: 0, tgtZ: 0,
  };

  function beginPreviewSession() {
    if (previewSession.active) endPreviewSession();
    previewSession.camX = camera.position.x;
    previewSession.camY = camera.position.y;
    previewSession.camZ = camera.position.z;
    previewSession.tgtX = controls.target.x;
    previewSession.tgtY = controls.target.y;
    previewSession.tgtZ = controls.target.z;
    previewSession.active = true;
  }

  function previewBody(id) {
    if (!previewSession.active) return;
    focusOnBody(id); // n'écrit jamais lastLockedId (réservé à UI.VIEW_FOCUS)
  }

  function previewClear() {
    // No-op : laisser la caméra où elle est ; le prochain previewBody la déplacera.
    // L'état lastLockedId reste intact.
  }

  function endPreviewSession() {
    if (!previewSession.active) return;
    previewSession.active = false;
    if (lastLockedId) {
      // Lock préservé pendant la session → on y revient.
      focusOnBody(lastLockedId);
      return;
    }
    // Sinon → interpolation vers le snapshot caméra libre capturé à l'ouverture.
    snapshotSource();
    state.toTx = previewSession.tgtX;
    state.toTy = previewSession.tgtY;
    state.toTz = previewSession.tgtZ;
    state.toCx = previewSession.camX;
    state.toCy = previewSession.camY;
    state.toCz = previewSession.camZ;
    state.elapsed = 0;
    state.active = true;
    state.followId = null;
  }

  // -------------------------------------------------------------------------
  // Abonnements canaux
  // -------------------------------------------------------------------------

  // CLIC : verrouille la cible. C'est la SEULE écriture de lastLockedId.
  const unsubFocus = bus.on(UI.VIEW_FOCUS, (p) => {
    const id = p?.id;
    if (!id) return;
    lastLockedId = id;
    isPreviewing = false;
    focusOnBody(id);
  });

  const unsubReset = bus.on(UI.VIEW_RESET, () => resetView());

  // SURVOL : mode preview, ne touche pas lastLockedId.
  // BodyMenu publie `{ id: null }` au mouseleave (audit Profile C).
  const unsubHover = bus.on(UI.VIEW_HOVER, (p) => {
    const id = p?.id ?? null;
    if (id) {
      isPreviewing = true;
      focusOnBody(id);
      return;
    }
    // Sortie de hover.
    isPreviewing = false;
    if (lastLockedId) {
      focusOnBody(lastLockedId);   // revenir au lock courant
    } else {
      // Pas de lock → vue d'ensemble. resetView() écrirait lastLockedId=null,
      // ce qui est déjà le cas — invariant respecté.
      resetView();
    }
  });

  // -------------------------------------------------------------------------
  // tick(dt) — à enregistrer APRÈS BodyMotionUpdater.
  // -------------------------------------------------------------------------
  function tick(dt) {
    // Follow-mode : animation terminée mais on suit toujours le body.
    if (!state.active && state.followId) {
      const node = bodies.get(state.followId);
      if (node) {
        const worldPos = node.getWorldPosition(v3.a);
        const dx = worldPos.x - controls.target.x;
        const dy = worldPos.y - controls.target.y;
        const dz = worldPos.z - controls.target.z;
        controls.target.set(worldPos.x, worldPos.y, worldPos.z);
        camera.position.set(
          camera.position.x + dx,
          camera.position.y + dy,
          camera.position.z + dz,
        );
      }
      return;
    }

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

    if (state.elapsed >= state.duration) {
      state.active = false;
    }
  }

  function destroy() {
    unsubFocus();
    unsubReset();
    unsubHover();
    state.followId = null;
    state.active = false;
    lastLockedId = null;
    isPreviewing = false;
  }

  return {
    tick,
    destroy,
    focusOnBody,
    resetView,
    // Exposition lecture-seule pour debug / tests Profile C.
    getLockedId: () => lastLockedId,
    isPreviewing: () => isPreviewing,
    // LOT 8C — API session preview glossaire.
    beginPreviewSession,
    previewBody,
    previewClear,
    endPreviewSession,
    isInPreviewSession: () => previewSession.active,
  };
}
