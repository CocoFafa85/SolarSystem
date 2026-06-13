import * as THREE from 'three';

// Textures procédurales — générées une fois par le CPU, uploadées au GPU,
// puis partagées (singleton) entre tous les corps mineurs.
//
// Choix d'implémentation : DataTexture 64×64 avec bruit value-noise basique.
// → Aucune dépendance shader, compatible avec InstancedMesh existant,
//   coût mémoire négligeable (12 KB / texture en RGB8).
//
// Lazy : la texture n'est créée qu'au premier `getAsteroidNoiseTexture()`.

const SIZE = 64;

// LOT 9 — variante "dark range" : mappe le bruit ∈ [0,1] linéairement vers
// [lo, hi] par canal (palette basalte/regolithe carboné C-asteroid). Distincte
// de `buildValueNoiseTexture` qui multiplie une base (utilisée pour les comètes,
// teinte plus claire).
function buildDarkRangeNoiseTexture(seed, loR, loG, loB, hiR, hiG, hiB) {
  const data = new Uint8Array(SIZE * SIZE * 4);
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const raw = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < raw.length; i++) raw[i] = rand();

  const dR = hiR - loR, dG = hiG - loG, dB = hiB - loB;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xi = (x + dx + SIZE) % SIZE;
          const yi = (y + dy + SIZE) % SIZE;
          sum += raw[yi * SIZE + xi];
        }
      }
      const n = sum / 9;
      const o = (y * SIZE + x) * 4;
      data[o]     = loR + dR * n;
      data[o + 1] = loG + dG * n;
      data[o + 2] = loB + dB * n;
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function buildValueNoiseTexture(seed, baseR, baseG, baseB) {
  // RGBFormat est SUPPRIMÉ depuis r137 — DataTexture impose RGBA en r184.
  const data = new Uint8Array(SIZE * SIZE * 4);
  // PRNG mulberry32 pour reproductibilité entre sessions.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Valeur lissée par moyenne 3×3 (cheap blur sur 1 passe).
  const raw = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < raw.length; i++) raw[i] = rand();

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xi = (x + dx + SIZE) % SIZE;
          const yi = (y + dy + SIZE) % SIZE;
          sum += raw[yi * SIZE + xi];
        }
      }
      const n = sum / 9;             // ∈ [0,1]
      const k = 0.55 + n * 0.45;     // contraste modéré
      const o = (y * SIZE + x) * 4;
      data[o]     = Math.min(255, baseR * k);
      data[o + 1] = Math.min(255, baseG * k);
      data[o + 2] = Math.min(255, baseB * k);
      data[o + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

let _asteroid = null;
let _comet = null;

export function getAsteroidNoiseTexture() {
  // LOT 9 — palette gris-sombre basalte/regolithe C-asteroid : [0x2a2622..0x6b5e4f].
  // Le matériau astéroïde applique `color = 0xffffff` (cf. AsteroidBelt) pour ne
  // pas multiplier la teinte une seconde fois — la texture porte seule la valeur.
  if (!_asteroid) _asteroid = buildDarkRangeNoiseTexture(
    0xA57E01D, 0x2a, 0x26, 0x22, 0x6b, 0x5e, 0x4f,
  );
  return _asteroid;
}

export function getCometNoiseTexture() {
  if (!_comet) _comet = buildValueNoiseTexture(0xC07E7401, 230, 230, 250);
  return _comet;
}

export function disposeProceduralTextures() {
  if (_asteroid) { _asteroid.dispose(); _asteroid = null; }
  if (_comet)    { _comet.dispose();    _comet = null; }
}
