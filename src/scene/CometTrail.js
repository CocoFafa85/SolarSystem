import * as THREE from 'three';
import { MINOR_BODY } from '../config/render.config.js';

// CometTrail (LOT 8 — ROLLBACK 7C + double queue) :
//
//   1. DUST (toutes les comètes) — ring buffer, particules FIGÉES là où le
//      nucleus était au moment de l'émission. Trace la trajectoire orbitale
//      courbée. La longueur visuelle dépend NATURELLEMENT de la vitesse
//      orbitale Kepler du nucleus → près du Soleil la comète va vite,
//      la trail s'étire ; loin elle se compacte. Aucun effet de timeSpeed
//      sur la longueur d'équilibre (1 émission par FRAME, pas par dt simulé).
//
//   2. ION (Hale-Bopp + Neowise, flag `ionTrail`) — ring buffer parallèle
//      avec DÉRIVE RADIALE ANTI-SOLAIRE proportionnelle à `1/r²` par frame.
//      Soleil à l'origine ⇒ direction = position normalisée. Particules
//      s'éloignent du Soleil sans changer de direction. Visuellement : queue
//      bleue rectiligne strictement anti-solaire.
//
// INDÉPENDANCE timeSpeed (critère bloquant) :
//   - Émission cadencée par FRAME (1 particule par tick, sans condition).
//   - Dérive cumulée fonction de `r` instantané (1/r²) — pas de deltaHours.
//   - À r fixé, queue identique à 1×/64×/1024× au bout de N frames.
//
// CONTRAT C :
//   - 1 ou 2 Float32Array(N*3) pré-alloués,
//   - aucune allocation par tick (math scalaire uniquement),
//   - 1 ou 2 `needsUpdate = true` par tick.

const PARTICLES_PER_TRAIL = 128;
// LOT 16 #8 — réduction taille particules ×0.5 post-LOT 12 (échelle 1:1 grossissait visuellement la trail).
const PARTICLE_SIZE_DUST  = MINOR_BODY.COMET_VISUAL_RADIUS_AU * 4.5;
const PARTICLE_SIZE_ION   = MINOR_BODY.COMET_VISUAL_RADIUS_AU * 2;

// Coefficient de pression radiative : drift par frame = K / r²
// (en UA, K = 0.0008 ⇒ à r=1 UA drift = 0.0008 / frame ; après 128 frames,
// queue ~ 10 % UA. À r=0.3 UA, drift ~11× plus fort → queue ~1 UA).
const ION_DRIFT_K = 0.0008;
// LOT 8B — dust trail aussi sous dérive (K plus faible) pour qu'elle soit
// visible à pause ET indépendante de timeSpeed (sinon la trail nécessite que
// le nucleus se déplace, ce qui dépend du dt simulé).
const DUST_DRIFT_K = 0.0002;

function buildDustTexture() { 
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.0, 'rgba(255, 230, 170, 1.0)');
  g.addColorStop(0.4, 'rgba(250, 245, 232, 0.84)');
  g.addColorStop(1.0, 'rgba(200, 160,  90, 0.0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function buildIonTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.0, 'rgba(180, 220, 255, 1.0)');
  g.addColorStop(0.4, 'rgb(48, 138, 255)');
  g.addColorStop(1.0, 'rgba( 40,  90, 200, 0.0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let _sharedDust = null;
let _sharedIon = null;
function getDustTexture() { if (!_sharedDust) _sharedDust = buildDustTexture(); return _sharedDust; }
function getIonTexture()  { if (!_sharedIon)  _sharedIon  = buildIonTexture();  return _sharedIon; }

function buildPointsRing(N, color, size, texture, renderOrder) {
  const positions = new Float32Array(N * 3);
  const geom = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute('position', posAttr);

  const mat = new THREE.PointsMaterial({
    map: texture,
    size,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    color,
    opacity: 0.85,
  });
  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;
  points.renderOrder = renderOrder;
  return { points, positions, geom, mat, posAttr };
}

/**
 * @param {{ ionTrail?: boolean }} [opts]
 */
export function createCometTrail(opts = {}) {
  const N = PARTICLES_PER_TRAIL;

  const dust = buildPointsRing(N, 0xf0c87f, PARTICLE_SIZE_DUST, getDustTexture(), 999);
  dust.points.name = 'CometTrail:dust';

  let ion = null;
  if (opts.ionTrail) {
    ion = buildPointsRing(N, 0xb8d8ff, PARTICLE_SIZE_ION, getIonTexture(), 998);
    ion.points.name = 'CometTrail:ion';
  }

  let head = 0;
  let aliveCount = 0;

  /**
   * @param {THREE.Vector3} cometWorldPos
   *
   * SIGNATURE : (position) — pas de deltaHours. La cadence d'émission est
   * désormais frame-based pour garantir l'indépendance vs timeSpeed.
   */
  function tick(cometWorldPos) {
    if (!cometWorldPos) return;

    // 1) Dust trail — LOT 8B : dérive radiale anti-solaire avec K plus faible.
    //    Garantit une queue visible MÊME À PAUSE (frames continuent), longueur
    //    fonction de `r` seul. Sans ça, à 1× la trail collait au nucleus car
    //    le nucleus bouge à peine entre 2 frames (cf. bug confirmé LOT 8).
    {
      const dp = dust.positions;
      for (let j = 0; j < aliveCount; j++) {
        const o = j * 3;
        const x = dp[o], y = dp[o + 1], z = dp[o + 2];
        const r2 = x * x + y * y + z * z;
        if (r2 < 1e-12) continue;
        const k = 1 + DUST_DRIFT_K / r2;
        dp[o]     = x * k;
        dp[o + 1] = y * k;
        dp[o + 2] = z * k;
      }
    }

    // 2) Ion trail : même algorithme avec K 4× plus fort (queue plus longue
    //    et rectiligne stricte, vs dust plus courte).
    if (ion !== null) {
      const ip = ion.positions;
      for (let j = 0; j < aliveCount; j++) {
        const o = j * 3;
        const x = ip[o], y = ip[o + 1], z = ip[o + 2];
        const r2 = x * x + y * y + z * z;
        if (r2 < 1e-12) continue;
        const k = 1 + ION_DRIFT_K / r2;
        ip[o]     = x * k;
        ip[o + 1] = y * k;
        ip[o + 2] = z * k;
      }
    }

    // 3) Émission : 1 particule par frame dans chaque ring au slot `head`.
    const o = head * 3;
    const dp = dust.positions;
    dp[o]     = cometWorldPos.x;
    dp[o + 1] = cometWorldPos.y;
    dp[o + 2] = cometWorldPos.z;
    if (ion !== null) {
      const ip = ion.positions;
      ip[o]     = cometWorldPos.x;
      ip[o + 1] = cometWorldPos.y;
      ip[o + 2] = cometWorldPos.z;
    }

    head = (head + 1) % N;
    if (aliveCount < N) aliveCount++;
    dust.posAttr.needsUpdate = true;
    if (ion !== null) ion.posAttr.needsUpdate = true;
  }

  function dispose() {
    dust.geom.dispose();
    dust.mat.dispose();
    if (ion !== null) {
      ion.geom.dispose();
      ion.mat.dispose();
    }
  }

  return {
    dust: dust.points,
    ion: ion ? ion.points : null,
    tick,
    dispose,
  };
}

export function disposeCometTrailShared() {
  if (_sharedDust) { _sharedDust.dispose(); _sharedDust = null; }
  if (_sharedIon)  { _sharedIon.dispose();  _sharedIon  = null; }
}
