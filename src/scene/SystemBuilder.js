import { Group } from 'three';
import { getManifest } from '../assets/textureManifest.js';
import { createCelestialBody } from './CelestialBody.js';

// Orchestrateur LOT 3 — assemble le scene graph complet à partir :
//   - du bodies.json normalisé (Session B / data),
//   - du manifeste d'assets (TEXTURE_MANIFEST),
//   - du cache de textures partagé (TextureCache).
//
// Hiérarchie produite :
//   Group "System"
//     ├─ Group bodyRoot (sun)
//     ├─ Group bodyRoot (mercury) …
//     └─ Group bodyRoot (earth)
//           └─ Group bodyRoot (moon)         ← satellites rattachés à leur parent
//
// Cette parenté permet à Session B de calculer la Lune en relatif Terre
// (position locale = orbite képlérienne de moon.orbital). Aucun calcul ici.
//
// LOT 5 :
//   - Plafond visuel pour les SATELLITES : `maxVisualRadiusAu = semiAxis / 3`
//     pour qu'un satellite ne soit jamais physiquement plus gros que son orbite
//     locale (sinon la Lune s'auto-englobe). L'exagération orbitale est ensuite
//     appliquée par BodyMotionUpdater via `satelliteOrbitDisplayScale`.
//   - Pluton : présent automatiquement via `data.bodies.pluto` (Session B) +
//     `textureManifest.pluto` (fallbackColor, dwarf:true). Le flag `dwarf` est
//     propagé sur `userData.dwarf` pour consommation par BodyMenu (Session D).

const SATELLITE_RADIUS_TO_ORBIT_RATIO = 1 / 3;

/**
 * @param {{bodies: Record<string, object>}} data  bodies.json normalisé
 * @param {import('../assets/TextureCache.js').TextureCache} textureCache
 * @returns {Promise<{root: import('three').Group, bodies: Map<string, import('three').Group>}>}
 */
export async function buildSystem(data, textureCache) {
  const root = new Group();
  root.name = 'System';

  const bodies = new Map();

  // Chargement parallèle de toutes les textures déclarées, en respectant
  // l'unicité via TextureCache. On résout chaque promesse AVANT d'instancier
  // les matériaux pour éviter les `map: null` puis `needsUpdate` en RAF.
  const assetsById = new Map();
  const loadJobs = [];

  for (const id of Object.keys(data.bodies)) {
    const manifest = getManifest(id);
    if (!manifest) { assetsById.set(id, {}); continue; }

    const bundle = {};
    if (manifest.map) {
      loadJobs.push(textureCache.load(manifest.map).then((t) => { bundle.map = t; }));
    }
    if (manifest.nightMap) {
      loadJobs.push(textureCache.load(manifest.nightMap).then((t) => { bundle.nightMap = t; }));
    }
    if (manifest.ring) {
      // Copie défensive complète : RingSystem lit innerAu, outerAu, color, opacity.
      bundle.ring = {
        innerAu: manifest.ring.innerAu,
        outerAu: manifest.ring.outerAu,
        color: manifest.ring.color,
        opacity: manifest.ring.opacity,
      };
      if (manifest.ring.texture) {
        loadJobs.push(
          textureCache.load(manifest.ring.texture).then((t) => { bundle.ringTexture = t; }),
        );
      }
    }
    if (manifest.fallbackColor !== undefined) bundle.fallbackColor = manifest.fallbackColor;
    assetsById.set(id, bundle);
  }

  const results = await Promise.allSettled(loadJobs);
  for (const r of results) {
    if (r.status === 'rejected') console.warn('[SystemBuilder] texture KO:', r.reason);
  }

  // Première passe : créer tous les corps SANS leur parent satellite.
  for (const [id, body] of Object.entries(data.bodies)) {
    const manifest = getManifest(id);
    const assets = assetsById.get(id) ?? {};

    // Plafond visuel pour les satellites : rayon ≤ orbite/3.
    const opts = { emissive: manifest?.emissive === true };
    if (body.parent && body.orbital?.semiMajorAxisAu > 0) {
      opts.maxVisualRadiusAu = body.orbital.semiMajorAxisAu * SATELLITE_RADIUS_TO_ORBIT_RATIO;
    }

    const node = createCelestialBody(body, assets, opts);
    // Propagation des métadonnées Session D (Pluton "planète naine", etc.).
    if (manifest?.dwarf) node.userData.dwarf = true;
    bodies.set(id, node);
  }

  // Seconde passe : parenté satellite → planète si `body.parent` défini,
  // sinon rattachement direct à la racine du système.
  for (const [id, body] of Object.entries(data.bodies)) {
    const node = bodies.get(id);
    const parentNode = body.parent ? bodies.get(body.parent) : null;
    (parentNode ?? root).add(node);
  }

  return { root, bodies };
}
