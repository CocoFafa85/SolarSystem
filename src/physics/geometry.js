// Helpers vectoriels 3D zéro-alloc.
// Toutes les fonctions de calcul reçoivent un buffer `out` mutable.
// Aucune dépendance Three.js (ces helpers sont utilisables dans les tests Node).

/** @typedef {{x:number, y:number, z:number}} Vec3 */

export function makeVec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

/** out = a - b */
export function sub(a, b, out) {
  out.x = a.x - b.x; out.y = a.y - b.y; out.z = a.z - b.z;
  return out;
}

/** out = a + b */
export function add(a, b, out) {
  out.x = a.x + b.x; out.y = a.y + b.y; out.z = a.z + b.z;
  return out;
}

/** out = a * s */
export function scale(a, s, out) {
  out.x = a.x * s; out.y = a.y * s; out.z = a.z * s;
  return out;
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function lengthSq(a) {
  return a.x * a.x + a.y * a.y + a.z * a.z;
}

export function length(a) {
  return Math.sqrt(lengthSq(a));
}

/** Angle non orienté en radians entre a et b. */
export function angleBetween(a, b) {
  const la = length(a);
  const lb = length(b);
  if (la === 0 || lb === 0) return 0;
  const c = dot(a, b) / (la * lb);
  // Clamp pour éviter NaN dû aux erreurs flottantes.
  const cc = c > 1 ? 1 : c < -1 ? -1 : c;
  return Math.acos(cc);
}
