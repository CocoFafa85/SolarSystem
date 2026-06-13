import * as THREE from 'three';
import { computeEarthSeasonMarkers } from '../physics/earthMarkers.js';

// Représentation visuelle des 4 repères saisonniers sur l'orbite de la Terre.
// Consomme `computeEarthSeasonMarkers(earthOrbital)` de Session B et instancie
// 4 petits anneaux (octahedron wireframe) colorés selon la saison.
//
// Note d'architecture : les positions sont héliocentriques fixes (les marqueurs
// décrivent des points de l'orbite, pas la Terre instantanée). On les pose à
// la racine du système, PAS dans le scene graph de la Terre.

const MARKER_RADIUS_AU = 0.012;

const MARKER_COLORS = Object.freeze({
  vernalEquinox:   0x6bc7ff,   // bleu printemps
  summerSolstice:  0xffd166,   // or été
  autumnalEquinox: 0xc77f3a,   // orange automne
  winterSolstice:  0xe6e9f2,   // blanc hiver
});

/**
 * @param {import('../physics/orbital.js').OrbitalElementsDeg} earthOrbital
 * @returns {THREE.Group}  Group nommé "EarthSeasonMarkers", attachable à la racine système.
 */
export function createEarthSeasonMarkers(earthOrbital) {
  const group = new THREE.Group();
  group.name = 'EarthSeasonMarkers';
  if (!earthOrbital) return group;

  const markers = computeEarthSeasonMarkers(earthOrbital);

  // Géométrie partagée — 4 marqueurs, 1 alloc géométrie totale.
  const shared = new THREE.OctahedronGeometry(MARKER_RADIUS_AU, 0);

  for (const [name, pos] of Object.entries(markers)) {
    const mat = new THREE.MeshBasicMaterial({
      color: MARKER_COLORS[name] ?? 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(shared, mat);
    mesh.name = `seasonMarker:${name}`;
    mesh.position.set(pos.x, pos.y, pos.z);
    group.add(mesh);
  }

  // Mémorise la géométrie partagée pour disposeObject (le disposer parcourt
  // chaque enfant ; partagée = elle sera disposée une fois par enfant, mais
  // THREE protège le double-dispose silencieusement).
  group.userData = { sharedGeometry: shared };
  return group;
}
