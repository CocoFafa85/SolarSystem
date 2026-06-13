import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as bus from '../ui/core/eventBus.js';
import { UI } from '../ui/core/channels.js';

// Wrapper OrbitControls — découplé de App pour pouvoir être remplacé
// (TrackballControls, FlyControls) sans toucher au reste du code.
//
// Damping activé : update() doit être appelé chaque frame depuis la RAF.
// Bornes de distance adaptées à l'échelle UA :
//   - minDistance 0.0001 (vue ras d'un anneau de Saturne),
//   - maxDistance 100    (vue d'ensemble jusqu'à Neptune ≈ 30 UA × confort).
//
// LOT 5C — log de debug throttlé 250 ms sur l'événement 'end' (fin d'interaction
// utilisateur). Aide à calibrer les positions des presets PoV sans monkey-patch.

const DEBUG_LOG_THROTTLE_MS = 250;

export function createCameraControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.0001;
  controls.maxDistance = 100;
  controls.zoomSpeed = 0.9;
  controls.rotateSpeed = 0.7;

  // LOT 9 (révision) — mapping demandé par l'utilisateur :
  //   LEFT   = DOLLY   (clic gauche + drag = avance/recul caméra←target)
  //   MIDDLE = ROTATE  (clic molette + drag = orbite — ancien comportement gauche)
  //   RIGHT  = PAN     (clic droit + drag = translation latérale)
  // Le `sceneClickRouter` (LOT 8) écoute `pointerdown` sans drag → un clic court
  // gauche reste un "click" focusable (le DOLLY se déclenche au mouvement).
  // Tactile inchangé (1 doigt = rotate, 2 doigts = dolly+pan).
  // LOT 9 (révision 4) — LEFT=ROTATE (orbite autour du focus), RIGHT=PAN,
  // clic molette désactivé (null). Molette scroll = DOLLY (inchangé).
  controls.mouseButtons = {
    LEFT:   THREE.MOUSE.ROTATE,
    MIDDLE: null,
    RIGHT:  THREE.MOUSE.PAN,
  };

  // Le navigateur ouvrirait son menu contextuel sur clic droit — bloqué pour
  // que OrbitControls capte intégralement le drag. Listener nommé pour cleanup.
  const onContextMenu = (e) => { e.preventDefault(); };
  domElement.addEventListener('contextmenu', onContextMenu);

  // LOT 10 — RIGHT adaptatif selon l'état de verrouillage caméra :
  //   - libre   (init, après UI.VIEW_RESET ou UI.VIEW_PRESET) → RIGHT = PAN
  //   - lockée  (après UI.VIEW_FOCUS sur un astre)            → RIGHT = ROTATE
  // Justification : ROTATE orbite autour de `controls.target` ; quand un astre
  // est verrouillé, target = astre → l'utilisateur tourne réellement autour
  // de lui. En caméra libre, target est arbitraire → PAN est plus utile.
  // LOT 10 — RIGHT adaptatif selon l'état de verrouillage caméra :
  //   - libre   (init, après UI.VIEW_RESET ou UI.VIEW_PRESET) → RIGHT = PAN
  //   - lockée  (après UI.VIEW_FOCUS sur un astre)            → RIGHT = ROTATE
  // ROTATE orbite autour de `controls.target` (= astre verrouillé), donnant
  // l'effet "suivre une orbite autour de l'astre" : sphère complète, azimut
  // et élévation libres comme un satellite en orbite quelconque.
  const setLocked = (locked) => {
    controls.mouseButtons.RIGHT = locked ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
  };
  const unsubLock    = bus.on(UI.VIEW_FOCUS,  (p) => { if (p?.id) setLocked(true); });
  const unsubUnlockR = bus.on(UI.VIEW_RESET,  () => setLocked(false));
  const unsubUnlockP = bus.on(UI.VIEW_PRESET, () => setLocked(false));

  // Listener nommé pour pouvoir le retirer proprement au teardown.
  let lastLog = 0;
  const onEnd = () => {
    const now = performance.now();
    if (now - lastLog < DEBUG_LOG_THROTTLE_MS) return;
    lastLog = now;
    const c = camera.position;
    const t = controls.target;
    // eslint-disable-next-line no-console
    console.log(
      `cam=(${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}) ` +
      `target=(${t.x.toFixed(3)},${t.y.toFixed(3)},${t.z.toFixed(3)})`,
    );
  };
  controls.addEventListener('end', onEnd);

  return {
    controls,
    update() { controls.update(); },
    dispose() {
      controls.removeEventListener('end', onEnd);
      domElement.removeEventListener('contextmenu', onContextMenu);
      unsubLock();
      unsubUnlockR();
      unsubUnlockP();
      controls.dispose();
    },
  };
}
