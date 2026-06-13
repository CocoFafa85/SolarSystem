// Loader navigateur : fetch bodies.json puis parse via le module pur.
import { parseBodies } from '../physics/bodyParser.js';

const BODIES_URL = 'bodies.json';

let _cache = null;
let _inflight = null;

export async function loadBodies(url = BODIES_URL) {
  if (_cache) return _cache;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`[loadBodies] HTTP ${res.status} sur ${url}`);
    const json = await res.json();
    _cache = parseBodies(json);
    _inflight = null;
    return _cache;
  })();

  return _inflight;
}
