// Manifeste DÉCLARATIF des assets visuels par corps céleste.
// Source unique de vérité — aucun chemin de texture ne doit apparaître ailleurs.
//
// Convention :
//   - `map`         : albedo, colorSpace = SRGB.
//   - `nightMap`    : émissif (Terre), colorSpace = SRGB.
//   - `ring`        : anneaux. Si `texture` présent → texturé ; sinon procédural.
//   - `fallbackColor` : utilisé par CelestialBody si `map` absent (Pluton).
//   - `dwarf`       : true → marqueur sémantique "planète naine" (Session D).

export const TEXTURE_MANIFEST = Object.freeze({
  sun:     Object.freeze({ map: 'textures/sun.jpg', emissive: true }),
  mercury: Object.freeze({ map: 'textures/mercury.jpg' }),
  venus:   Object.freeze({ map: 'textures/venus.jpg' }),
  earth:   Object.freeze({ map: 'textures/earth.jpg', nightMap: 'textures/earth_nightmap.jpg' }),
  moon:    Object.freeze({ map: 'textures/moon.jpg' }),
  mars:    Object.freeze({ map: 'textures/mars.jpg' }),

  // Jupiter — système d'anneaux ténu (anneau principal + Gossamer), procédural.
  jupiter: Object.freeze({
    map: 'textures/jupiter.jpg',
    ring: Object.freeze({
      innerAu: 0.00084,  // ~125 000 km
      outerAu: 0.00150,  // ~225 000 km (Gossamer outer)
      color: 0x8a7860,
      opacity: 0.10,
    }),
  }),

  saturn:  Object.freeze({
    map: 'textures/saturn.jpg',
    ring: Object.freeze({
      texture: 'textures/saturn_ring.jpg',
      innerAu: 0.000468,
      outerAu: 0.000936,
    }),
  }),

  // Uranus — 13 anneaux fins, regroupés en un disque procédural sombre.
  uranus:  Object.freeze({
    map: 'textures/uranus.jpg',
    ring: Object.freeze({
      innerAu: 0.000270,  // ~40 000 km
      outerAu: 0.000350,  // ~52 000 km (anneau ε)
      color: 0x6a7a82,
      opacity: 0.18,
    }),
  }),

  // Neptune — 5 anneaux ténus dont Adams + arcs.
  neptune: Object.freeze({
    map: 'textures/neptune.jpg',
    ring: Object.freeze({
      innerAu: 0.000275,
      outerAu: 0.000425,
      color: 0x6080a0,
      opacity: 0.12,
    }),
  }),

  // Pluton — pas de texture dans /textures, fallback couleur unie.
  pluto:   Object.freeze({
    fallbackColor: 0xc8b6a0,
    dwarf: true,
  }),
});

/** Retourne `null` si le corps n'a pas de manifeste. */
export function getManifest(bodyId) {
  return TEXTURE_MANIFEST[bodyId] ?? null;
}
