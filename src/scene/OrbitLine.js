import * as THREE from 'three';
import { orbitalElementsToHeliocentric } from '../physics/orbital.js';
import { ORBIT, ORBIT_COLORS } from '../config/render.config.js';

// Construit une polyligne fermée représentant l'orbite d'un corps képlérien.
// L'inclinaison écliptique est traitée par `orbitalElementsToHeliocentric`
// (rotation Rz(-Ω) · Rx(-i) · Rz(-ω)), garantissant des plans orbitaux distincts.
//
// Allocation : 1 BufferGeometry + 1 Material + 1 Line PAR orbite, à l'init.
// Aucun objet temporaire créé après construction (les samples remplissent un
// Float32Array typed-array directement — pas de Vector3 intermédiaires).

export function createOrbitLine(orbital, options = {}) {
  const segments = options.segments ?? ORBIT.SEGMENTS;
  // LOT 7 — résolution de la couleur :
  //   priorité 1 : options.color explicite (compatibilité legacy comètes),
  //   priorité 2 : palette ORBIT_COLORS[family] si family fourni,
  //   priorité 3 : ORBIT.DEFAULT_COLOR.
  const color = options.color
    ?? (options.family ? ORBIT_COLORS[options.family] : undefined)
    ?? ORBIT.DEFAULT_COLOR;

  const positions = new Float32Array((segments + 1) * 3);
  const stepDeg = 360 / segments;

  // Échantillonnage par balayage de l'anomalie moyenne (cohérent avec la
  // propagation runtime de Session B). Le solveur de Kepler est appelé une
  // seule fois par sample, à l'init uniquement.
  for (let i = 0; i <= segments; i++) {
    const meanAnomalyDeg = (orbital.meanAnomalyDeg + i * stepDeg) % 360;
    const p = orbitalElementsToHeliocentric({
      semiMajorAxisAu: orbital.semiMajorAxisAu,
      eccentricity: orbital.eccentricity,
      inclinationDeg: orbital.inclinationDeg,
      longitudeAscendingNodeDeg: orbital.longitudeAscendingNodeDeg,
      argumentPerihelionDeg: orbital.argumentPerihelionDeg,
      meanAnomalyDeg,
    });
    const o = i * 3;
    positions[o] = p.x;
    positions[o + 1] = p.y;
    positions[o + 2] = p.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.55,
  });

  const line = new THREE.LineLoop(geometry, material);
  line.frustumCulled = true;
  return line;
}
