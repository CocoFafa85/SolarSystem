// CursorCustom (LOT 11) — curseur DOM overlay avec effet "ressort orbital".
// - dot central : suivi 1:1 sur pointermove.
// - ring orbital : suivi lerp (≈100 ms perçus) → effet trainée fluide.
// - 1 listener pointermove, 1 RAF partagée, 4 scalaires d'état, zéro alloc/frame.
// - Skip total sur `pointer:coarse` (mobile) ou `prefers-reduced-motion` (ring
//   colle au dot dans ce dernier cas).

const LERP_FACTOR = 0.55;        // LOT 16 patch — latence ring fortement réduite (rattrape en ~2 frames)
const ROOT_CLASS  = 'has-custom-cursor';

function isCoarsePointer() {
  return typeof matchMedia === 'function'
    && matchMedia('(pointer: coarse)').matches;
}
function prefersReducedMotion() {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function mountCursorCustom() {
  if (typeof window === 'undefined') return { destroy() {} };
  if (isCoarsePointer()) return { destroy() {} };

  const reduced = prefersReducedMotion();

  const root = document.createElement('div');
  root.className = 'cursor-custom';
  root.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('div');
  ring.className = 'cursor-custom__ring';
  // Orbite + petite Terre qui tourne dessus (CSS animation).
  const orbit = document.createElement('div');
  orbit.className = 'cursor-custom__earth-orbit';
  const earth = document.createElement('div');
  earth.className = 'cursor-custom__earth';
  orbit.appendChild(earth);
  ring.appendChild(orbit);

  const dot = document.createElement('div');
  dot.className = 'cursor-custom__dot';

  root.append(ring, dot);
  document.body.appendChild(root);
  document.documentElement.classList.add(ROOT_CLASS);

  // État (scalaires module-scope, zéro alloc).
  let targetX = -100, targetY = -100;  // hors écran tant qu'aucun mouvement
  let ringX   = targetX, ringY = targetY;
  let visible = false;
  let rafId   = 0;

  function onMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!visible) {
      visible = true;
      root.classList.add('is-visible');
      // Snap initial pour ne pas voir le ring rattraper depuis -100,-100.
      ringX = targetX; ringY = targetY;
    }
  }
  function onLeave() {
    visible = false;
    root.classList.remove('is-visible');
  }
  function onDown() { root.classList.add('is-pressing'); }
  function onUp()   { root.classList.remove('is-pressing'); }

  function tick() {
    if (reduced) {
      ringX = targetX; ringY = targetY;
    } else {
      ringX += (targetX - ringX) * LERP_FACTOR;
      ringY += (targetY - ringY) * LERP_FACTOR;
    }
    // Dot : suivi immédiat ; ring : lerp. translate3d → GPU compositing.
    dot.style.transform  = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  window.addEventListener('pointermove',  onMove,  { passive: true });
  window.addEventListener('pointerleave', onLeave, { passive: true });
  window.addEventListener('pointerdown',  onDown,  { passive: true });
  window.addEventListener('pointerup',    onUp,    { passive: true });

  return {
    el: root,
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove',  onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown',  onDown);
      window.removeEventListener('pointerup',    onUp);
      document.documentElement.classList.remove(ROOT_CLASS);
      root.remove();
    },
  };
}
