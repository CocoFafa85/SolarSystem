import * as THREE from 'three';
import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';

// SceneClickRouter — un seul raycaster pour le clic in-scene.
// LOT 7 — usage initial : Soleil cliquable de partout. Architecture extensible
// (autres corps cliquables ajoutables via `addClickable(node, id)`).
//
// CONTRAT C — zéro alloc par pointerdown :
//   - `_ray`, `_ndc`, `_intersects` créés à l'init module-scope (partagés
//     conceptuellement avec SeasonMarkersHover mais slots distincts pour
//     éviter toute course entre mousemove et pointerdown).
//   - `intersectObjects(targets, true, _intersects)` mute le tableau.

const _ndc = new THREE.Vector2();

/**
 * @param {{ canvas: HTMLCanvasElement, camera: import('three').Camera }} deps
 */
export function createSceneClickRouter({ canvas, camera }) {
  if (!canvas || !camera) {
    throw new Error('createSceneClickRouter: dépendances manquantes');
  }

  const _ray = new THREE.Raycaster();
  const _intersects = [];
  /** @type {Array<{ node: import('three').Object3D, id: string }>} */
  const clickables = [];

  function addClickable(node, id) {
    if (!node || !id) return;
    clickables.push({ node, id });
  }

  function onPointerDown(ev) {
    if (clickables.length === 0) return;
    // Bouton gauche uniquement (laisser pan/zoom OrbitControls intactes).
    if (ev.button !== undefined && ev.button !== 0) return;
    // LOT 8 — guard cible : ignorer les pointerdown qui n'ont PAS le canvas
    // comme cible directe (ex. clic sur un bouton UI en overlay au-dessus du
    // canvas qui bubble jusqu'à lui). Évite la régression PoV LOT 7B/7C où
    // le router émettait `UI.VIEW_FOCUS` au clic d'un preset, court-circuitant
    // l'abonnement `UI.VIEW_PRESET` du CameraPresets.
    if (ev.target !== canvas) return;

    const rect = canvas.getBoundingClientRect();
    _ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

    _ray.setFromCamera(_ndc, camera);
    _intersects.length = 0;
    // Test contre tous les nodes cliquables ; `true` = recursive (les meshes
    // sont enfants des Groups bodyRoot via axialTilt).
    for (let i = 0; i < clickables.length; i++) {
      _ray.intersectObject(clickables[i].node, true, _intersects);
    }
    if (_intersects.length === 0) return;

    // Trouve à quel clickable appartient le 1ᵉʳ hit (tri par distance déjà fait).
    const hit = _intersects[0].object;
    for (let i = 0; i < clickables.length; i++) {
      const c = clickables[i];
      // L'intersection peut tomber sur un descendant : remonter via parent chain.
      let p = hit;
      while (p) {
        if (p === c.node) {
          bus.emit(UI.VIEW_FOCUS, { id: c.id });
          bus.emit(UI.BODY_SELECT, { id: c.id });
          return;
        }
        p = p.parent;
      }
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });

  function destroy() {
    canvas.removeEventListener('pointerdown', onPointerDown);
    clickables.length = 0;
    _intersects.length = 0;
  }

  return { addClickable, destroy };
}
