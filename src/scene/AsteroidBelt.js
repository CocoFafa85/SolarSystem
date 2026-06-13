import * as THREE from 'three';
import { evaluateOrbitalElementsInto } from '../physics/orbital.js';
import { MINOR_BODY } from '../config/render.config.js';
import { getAsteroidNoiseTexture } from '../assets/proceduralTextures.js';

// Buffer out-param module-scope pour `evaluateOrbitalElementsInto`.
// Utilisé à l'init ET au reset — pas en RAF (asteroidBeltUpdater a le sien).
const _OUT = { x: 0, y: 0, z: 0, r: 0, trueAnomaly: 0 };

// Ceinture d'astéroïdes — InstancedMesh : N corps = 1 seul draw call GPU.
//
// Choix d'architecture :
//   - une seule SphereGeometry low-poly partagée (12×6 segments suffisent à
//     ces tailles d'écran),
//   - matériau MeshStandardMaterial unique → réagit à PointLight solaire,
//   - userData.elements : tableau ordonné des éléments orbitaux, indexé par
//     instanceId. Session B itère ce tableau et appelle `setMatrixAt(i, M)`,
//     puis `instanceMatrix.needsUpdate = true` une fois par frame.
//
// Zéro-Allocation : un Matrix4 et un Vector3 réutilisés à l'init ;
// Session B doit faire de même en runtime (matrice prêtée via userData.scratch).

const SEG_W = 12;
const SEG_H = 6;

/**
 * @param {Array<object>} minorBodies   Liste normalisée (normalizeMinorBody)
 */
export function createAsteroidBelt(minorBodies) {
  if (!Array.isArray(minorBodies) || minorBodies.length === 0) {
    return null;
  }

  const geometry = new THREE.SphereGeometry(
    MINOR_BODY.ASTEROID_VISUAL_RADIUS_AU, SEG_W, SEG_H,
  );
  // Texture procédurale partagée — 1 seul upload GPU pour TOUS les astéroïdes
  // (lazy : créée à la première demande, mise en cache module).
  const material = new THREE.MeshStandardMaterial({
    color: MINOR_BODY.ASTEROID_COLOR,
    map: getAsteroidNoiseTexture(),
    roughness: 1.0,
    metalness: 0.0,
  });

  const count = minorBodies.length;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'AsteroidBelt';
  mesh.frustumCulled = false; // les positions changent à chaque frame
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // Initialisation des matrices avec la position J2000 de chaque astéroïde.
  // Session B remplacera ces matrices à chaque tick.
  const M = new THREE.Matrix4();
  // LOT 5C — sauvegarde des meanAnomaly d'epoch en Float64Array typé.
  // LOT 6  — passage à `evaluateOrbitalElementsInto` (out-buffer) : zéro alloc
  // par astéroïde même à l'init (utile quand densifyAsteroids monte à ×100).
  const epochMeanAnomalies = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    epochMeanAnomalies[i] = minorBodies[i].orbital.meanAnomalyDeg;
    evaluateOrbitalElementsInto(minorBodies[i].orbital, _OUT);
    M.makeTranslation(_OUT.x, _OUT.y, _OUT.z);
    mesh.setMatrixAt(i, M);
  }
  mesh.instanceMatrix.needsUpdate = true;

  const elements = minorBodies.map((b) => b.orbital);

  mesh.userData = {
    elements,
    ids: minorBodies.map((b) => b.id),
    epochMeanAnomalies,
    // Scratch réutilisable pour Session B — ZÉRO new dans la RAF.
    scratch: { matrix: new THREE.Matrix4() },
    /**
     * LOT 5C — replace TOUS les astéroïdes à leur meanAnomaly d'epoch et
     * réécrit l'InstancedMatrix. Zéro allocation : on réutilise scratch.matrix.
     */
    reset() {
      const scratchM = mesh.userData.scratch.matrix;
      for (let i = 0; i < count; i++) {
        elements[i].meanAnomalyDeg = epochMeanAnomalies[i];
        evaluateOrbitalElementsInto(elements[i], _OUT);
        scratchM.makeTranslation(_OUT.x, _OUT.y, _OUT.z);
        mesh.setMatrixAt(i, scratchM);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };

  return mesh;
}
