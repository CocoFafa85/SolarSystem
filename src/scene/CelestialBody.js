import * as THREE from 'three';
import { createRingSystem } from './RingSystem.js';
import { VISUAL_SCALE } from '../config/render.config.js';
import { obliquityToTiltRotationX } from './axialTiltMath.js';
import { computeVisualRadius } from './visualScale.js';

// Construit le scene graph d'un corps céleste.
//
//   <Group bodyRoot>           ← position héliocentrique pilotée par Session B
//     └─ <Group axialTilt>     ← rotation statique = obliquité
//          ├─ <Mesh sphere>    ← rotation propre pilotée par Session B
//          └─ <Mesh ring>      ← optionnel (Saturne)
//
// Cette séparation garantit que la rotation propre n'altère pas l'inclinaison
// d'axe (problème classique du code legacy où tout était mis sur le même mesh).

const SPHERE_WIDTH_SEGMENTS = 64;
const SPHERE_HEIGHT_SEGMENTS = 32;

/**
 * @param {object} body         Normalised body (cf. bodyParser.normalizeBody)
 * @param {object} assets       { map, nightMap?, ring? } — instances THREE.Texture déjà chargées
 * @param {object} [opts]
 * @returns {THREE.Group}       Group racine, avec userData.{ id, mesh, ring, axialTilt }
 */
export function createCelestialBody(body, assets, opts = {}) {
  if (!body || !body.physical) {
    throw new Error('createCelestialBody: body normalisé requis');
  }

  const root = new THREE.Group();
  root.name = body.id;

  const axialTilt = new THREE.Group();
  axialTilt.name = `${body.id}:axialTilt`;
  // Correction LOT 5 : on veut que l'axe de spin soit à `obliquity` du PÔLE
  // ÉCLIPTIQUE (+Z world). L'ancienne ligne `rotation.x = ε` plaçait l'axe
  // dans le plan orbital. Voir `axialTiltMath.js` pour la démonstration.
  axialTilt.rotation.x = obliquityToTiltRotationX(body.physical.obliquityDeg);
  root.add(axialTilt);

  // Rayon d'AFFICHAGE distinct du rayon physique (positions = UA strictes).
  // Cf. VISUAL_SCALE dans render.config.js pour le tradeoff.
  const isStar = body.type === 'star' || opts.emissive === true;
  // Pour un satellite, le caller peut imposer un plafond visuel via
  // opts.maxVisualRadiusAu (ex. orbit_local / 3) — évite que le satellite
  // ne s'auto-écrase contre son parent.
  const visualRadius = isStar
    ? computeVisualRadius(
        body.physical.radiusAu,
        VISUAL_SCALE.STAR_RADIUS_MULTIPLIER,
        0,
        opts.maxVisualRadiusAu ?? Infinity,
      )
    : computeVisualRadius(
        body.physical.radiusAu,
        VISUAL_SCALE.PLANET_RADIUS_MULTIPLIER,
        VISUAL_SCALE.MIN_VISUAL_RADIUS_AU,
        opts.maxVisualRadiusAu ?? Infinity,
      );

  const geometry = new THREE.SphereGeometry(
    visualRadius,
    SPHERE_WIDTH_SEGMENTS,
    SPHERE_HEIGHT_SEGMENTS,
  );

  let material;
  if (body.type === 'star' || opts.emissive) {
    // Le Soleil ne reçoit pas de lumière — Basic suffit, pas de PBR.
    material = new THREE.MeshBasicMaterial({ map: assets.map ?? null });
  } else {
    material = new THREE.MeshStandardMaterial({
      map: assets.map ?? null,
      color: assets.map ? 0xffffff : (assets.fallbackColor ?? 0xffffff),
      emissiveMap: assets.nightMap ?? null,
      emissive: assets.nightMap ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
      emissiveIntensity: assets.nightMap ? 0.6 : 0,
      roughness: 1.0,
      metalness: 0.0,
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `${body.id}:mesh`;
  axialTilt.add(mesh);

  let ring = null;
  if (assets.ring) {
    // LOT 5C — scaling des anneaux pour suivre l'exagération visuelle de la planète.
    // Les rayons du manifeste sont en UA PHYSIQUES (sacrés). La sphère est gonflée
    // par VISUAL_SCALE.PLANET_RADIUS_MULTIPLIER ; sans appliquer ce même facteur
    // aux rayons d'anneaux, ils restent enfouis à 1/500ᵉ du mesh de la planète.
    // `ringScale = visualRadius / radiusAu` couvre aussi le cas du plancher
    // MIN_VISUAL_RADIUS_AU (corps clampés : rapport ≠ multiplier exact).
    const ringScale = visualRadius / body.physical.radiusAu;
    const scaledRing = {
      innerAu: assets.ring.innerAu * ringScale,
      outerAu: assets.ring.outerAu * ringScale,
      color:   assets.ring.color,
      opacity: assets.ring.opacity,
    };
    ring = createRingSystem(scaledRing, assets.ringTexture ?? null);
    ring.name = `${body.id}:ring`;
    // LOT 5D — `RingGeometry` est dans le plan XY local, mais le plan équatorial
    // est perpendiculaire à l'axe de spin (axe Y du mesh, après le tilt sur X).
    // On bascule la ring sur XZ local pour qu'après le tilt de `axialTilt`, elle
    // se retrouve dans le plan équatorial physique.
    ring.rotation.x = Math.PI / 2;
    axialTilt.add(ring);
  }

  root.userData = { id: body.id, mesh, ring, axialTilt, visualRadius };
  return root;
}
