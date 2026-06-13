// LOT 10 — Audit précision Profile B : à ×131072 (cap relevé), le pas
// d'intégration effectif atteint ≈ 2186 h/frame. Vérifie que les propagateurs
// analytiques restent corrects vs un pas fin de référence.
//
// Cible : la propagation Kepler en mean-anomaly est analytique (dM = n·dt) →
// l'erreur de troncature est nulle au niveau du modèle. L'EclipseTracker
// dispose d'un sub-stepping à 1 h qui garantit la résolution des fenêtres
// d'éclipse même à pas grossier.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SimulationClock } from '../src/time/SimulationClock.js';
import { loadBodiesFromFile } from '../src/physics/bodyLoader.js';
import { createEclipseTracker } from '../src/physics/eclipses.js';
import { orbitalElementsToHeliocentric } from '../src/physics/orbital.js';
import { HOURS_PER_DAY, HOURS_PER_YEAR, MU_SUN_AU3_PER_DAY2 } from '../src/physics/constants.js';

test('SimulationClock — cap LOT 10 = ±131072', () => {
  const c = new SimulationClock();
  c.setSpeed(1e9);
  assert.equal(c.getSpeed(), 131072);
  c.setSpeed(-1e9);
  assert.equal(c.getSpeed(), -131072);
});

function propagateOneYear(earthElInit, deltaHoursPerStep) {
  const el = { ...earthElInit };
  const totalH = HOURS_PER_YEAR;
  const steps = Math.ceil(totalH / deltaHoursPerStep);
  const n = Math.sqrt(MU_SUN_AU3_PER_DAY2 / el.semiMajorAxisAu ** 3);
  for (let i = 0; i < steps; i++) {
    const dt = Math.min(deltaHoursPerStep, totalH - i * deltaHoursPerStep);
    const dDays = dt / HOURS_PER_DAY;
    let m = (el.meanAnomalyDeg + (n * dDays * 180) / Math.PI) % 360;
    if (m < 0) m += 360;
    el.meanAnomalyDeg = m;
  }
  return orbitalElementsToHeliocentric(el);
}

test('Propagation Kepler : 1 an dt=2200 h vs dt=24 h — écart < 1 ppm', async () => {
  const data = await loadBodiesFromFile();
  const earthEl = data.bodies.earth.orbital;

  const fine = propagateOneYear(earthEl, 24);
  const coarse = propagateOneYear(earthEl, 2200); // ≈ pas effectif à ×131072 @ 60 fps

  const dx = coarse.x - fine.x;
  const dy = coarse.y - fine.y;
  const dz = coarse.z - fine.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  // 1 ppm de 1 UA = 1e-6 UA ≈ 150 km : Kepler analytique doit faire mieux
  // que ça grâce à la nature non-incrémentale du dM = n·dt.
  assert.ok(dist < 1e-6,
    `écart position 1 an ${dist.toExponential(3)} UA dépasse 1 ppm`);
});

test('EclipseTracker à pas grossier : compteur stable vs pas fin (sub-stepping efficace)', async () => {
  const data = await loadBodiesFromFile();
  const baseCfg = {
    earthElements: data.bodies.earth.orbital,
    moonElements: data.bodies.moon.orbital,
    sunRadiusAu: data.bodies.sun.physical.radiusAu,
    earthRadiusAu: data.bodies.earth.physical.radiusAu,
    moonRadiusAu: data.bodies.moon.physical.radiusAu,
  };
  // Référence : appel unique advance(10 ans).
  const ref = createEclipseTracker(baseCfg);
  ref.advance(10 * HOURS_PER_YEAR);
  const cRef = { ...ref.getCounters() };

  // Simulation pas grossier façon ×131072 : chunks de 2200 h, advance par chunk.
  const coarse = createEclipseTracker(baseCfg);
  const CHUNK = 2200;
  let remaining = 10 * HOURS_PER_YEAR;
  while (remaining > 0) {
    const dt = Math.min(CHUNK, remaining);
    coarse.advance(dt);
    remaining -= dt;
  }
  const cCoarse = coarse.getCounters();

  assert.deepEqual(cCoarse, cRef,
    `compteurs divergent : ref=${JSON.stringify(cRef)} vs coarse=${JSON.stringify(cCoarse)}`);
});
