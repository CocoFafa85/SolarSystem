import * as THREE from 'three';
import { createOrbitLine } from './OrbitLine.js';
import { MINOR_BODY } from '../config/render.config.js';
import { getCometNoiseTexture, getAsteroidNoiseTexture } from '../assets/proceduralTextures.js';

// Système comètes — chaque comète a son propre Group {nucleus, orbit} pour que
// les orbites fortement excentriques (e > 0.9) restent identifiables.
// Pas d'InstancedMesh ici : la cardinalité est faible (~5) et chaque ellipse
// doit pouvoir être désactivée / colorée individuellement (extension LOT 4 D).
//
// Le nucléus est un Mesh sphérique gonflé visuellement ; la queue de poussière
// procédurale (cycle solaire) est laissée au LOT 4 Session B + D.

const SEG_W = 16;
const SEG_H = 8;

/**
 * @param {Array<object>} comets  Liste normalisée (normalizeMinorBody)
 * @param {{ variant?: 'comet'|'asteroid' }} [opts]
 *   LOT 9 — `variant: 'asteroid'` route le matériau vers la texture sombre
 *   `getAsteroidNoiseTexture` + couleur neutre. Utilisé pour Cérès/Vesta/Pallas
 *   (focusables individuellement, donc instanciés ici plutôt que dans le belt).
 */
export function createCometSystem(comets, opts = {}) {
  const root = new THREE.Group();
  root.name = 'Comets';
  if (!Array.isArray(comets) || comets.length === 0) return { root, comets: new Map() };

  const isAsteroid = opts.variant === 'asteroid';

  const sharedGeom = new THREE.SphereGeometry(
    MINOR_BODY.COMET_VISUAL_RADIUS_AU, SEG_W, SEG_H,
  );
  // Texture procédurale partagée (cf. AsteroidBelt) — granulation glace/poussière
  // pour les comètes, basalte/regolithe pour les astéroïdes promus.
  const sharedMat = new THREE.MeshBasicMaterial({
    color: isAsteroid ? 0xffffff : MINOR_BODY.COMET_NUCLEUS_COLOR,
    map: isAsteroid ? getAsteroidNoiseTexture() : getCometNoiseTexture(),
  });

  const entries = new Map();

  for (const c of comets) {
    const group = new THREE.Group();
    group.name = `comet:${c.id}`;

    const nucleus = new THREE.Mesh(sharedGeom, sharedMat);
    nucleus.name = `${c.id}:nucleus`;
    group.add(nucleus);

    const orbit = createOrbitLine(c.orbital, {
      color: MINOR_BODY.COMET_ORBIT_COLOR,
      segments: 1024,                                  // ellipse longue → plus de samples
    });
    orbit.name = `${c.id}:orbit`;
    // LOT 8B — id pour OrbitLineHover (alignement avec orbites planètes/naines).
    orbit.userData.bodyId = c.id;
    // LOT 8D — semi-grand axe pour threshold adaptatif (comètes longues : 186 UA Hale-Bopp, 358 UA Neowise).
    orbit.userData.semiMajorAxisAu = c.orbital.semiMajorAxisAu;

    // L'orbite est ajoutée au root (héliocentrique), pas au group de la comète,
    // sinon elle suivrait la translation du nucléus.
    root.add(orbit);
    root.add(group);

    entries.set(c.id, { root: group, nucleus, orbit, orbital: c.orbital });
  }

  // Géométrie + matériau partagés : on les attache au root pour qu'un seul
  // disposeObject(root) libère tout (le disposer parcourt en traverse).
  root.userData = { sharedGeom, sharedMat };

  return { root, comets: entries };
}
