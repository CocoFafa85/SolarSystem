import { parseMinorBodies } from '../physics/minorBodyParser.js';

const ASTEROIDS_URL = 'asteroids.json';

let _cache = null;
let _inflight = null;

export async function loadAsteroids(url = ASTEROIDS_URL) {
  if (_cache) return _cache;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`[loadAsteroids] HTTP ${res.status} sur ${url}`);
    const json = await res.json();
    // LOT 10 — Cérès est traitée comme PLANÈTE NAINE (dataset bodies.json),
    // on l'exclut donc du catalogue astéroïdes pour supprimer le doublon
    // d'identité (entrée BodyMenu dupliquée, orbite mal routée). Suppression
    // non destructive sur le JSON, simple filtre côté loader.
    if (json && typeof json === 'object' && 'ceres' in json) {
      delete json.ceres;
    }
    _cache = parseMinorBodies(json);
    _inflight = null;
    return _cache;
  })();

  return _inflight;
}
