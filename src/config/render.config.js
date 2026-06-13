/**
 * Configuration centrale du rendu WebGL.
 * Source unique de vérité — interdit de hardcoder ces valeurs ailleurs.
 *
 * Échelle de référence : 1 unité Three.js = 1 UA (Unité Astronomique).
 */

export const RENDERER = Object.freeze({
  antialias: true,
  logarithmicDepthBuffer: true,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
  preserveDrawingBuffer: false,
});

export const CAMERA = Object.freeze({
  fov: 50,
  near: 0.00001,
  far: 1000,
  initialPosition: Object.freeze({ x: 0, y: 8, z: 20 }),
});

export const PIXEL_RATIO_CAP = 2;

/**
 * Échelle visuelle des corps célestes.
 * Les POSITIONS héliocentriques restent en UA strictes ; seul le rayon RENDU
 * est amplifié, car à 1 unité = 1 UA la Terre (4·10⁻⁵) est sub-pixel.
 *
 * Tradeoff connu : la Lune (visuelRadius ≈ 5·10⁻³) sera plus grosse que sa
 * distance orbitale à la Terre (2.57·10⁻³). Acceptable pour LOT 1-4 ; un
 * mode "echelle réelle" sera ajouté plus tard via toggle UI (Session D).
 */
export const VISUAL_SCALE = Object.freeze({
  PLANET_RADIUS_MULTIPLIER: 500,
  STAR_RADIUS_MULTIPLIER: 50,
  MIN_VISUAL_RADIUS_AU: 0.001,
});

/** Caméra : distances de focus relatives au rayon visuel de la cible. */
export const FOCUS = Object.freeze({
  DISTANCE_MULTIPLIER: 6,     // camera.distance = visualRadius × ce facteur
  STAR_DISTANCE_MULTIPLIER: 4,
  LERP_DURATION_SEC: 0.8,     // durée de l'animation de focus
  MIN_TARGET_DISTANCE: 0.005, // évite asymptote sur petite cible
});

export const ORBIT = Object.freeze({
  SEGMENTS: 512,
  DEFAULT_COLOR: 0x4a5070,
});

/**
 * LOT 7 — palette d'orbites par famille de corps. Les couleurs sont sélectionnées
 * pour rester lisibles sur fond stellaire sans saturer dans le tone-mapping ACES.
 *   - planet    : bleu froid neutre (planètes principales)
 *   - satellite : violet diminué (Lune et futures lunes galiléennes)
 *   - dwarf     : magenta — distingue les 5 planètes naines IAU
 *   - minor     : bleu d'eau profonde, déjà utilisé par MINOR_BODY.COMET_ORBIT_COLOR
 *     (gardé séparé ici pour cohérence d'API ; valeur partagée)
 */
export const ORBIT_COLORS = Object.freeze({
  planet:    0x4a5070,
  satellite: 0x6a55a8,
  dwarf:     0xa8508a,
  minor:     0x6a8fbf,
});

/**
 * Corps mineurs (astéroïdes, comètes) — facteurs visuels.
 * Les POSITIONS restent en UA strictes ; seules les TAILLES de rendu sont gonflées
 * pour la lisibilité (rayons réels < 1e-7 UA = sub-pixel à toute distance utile).
 */
export const MINOR_BODY = Object.freeze({
  ASTEROID_VISUAL_RADIUS_AU: 0.0008,   // ≈ taille de Saturne, lisible sans masquer
  // LOT 9 — neutre : la texture procédurale porte seule la teinte sombre
  // (basalte/regolithe ∈ [0x2a..0x6b]). Cf. proceduralTextures.js.
  ASTEROID_COLOR: 0xffffff,
  COMET_VISUAL_RADIUS_AU: 0.002,
  COMET_NUCLEUS_COLOR: 0xeaeaff,
  COMET_ORBIT_COLOR: 0x6a8fbf,
});

export const ECLIPTIC = Object.freeze({
  GRID_RADIUS_AU: 32,
  GRID_DIVISIONS: 16,
  GRID_COLOR: 0x202840,
  AXIS_LENGTH_AU: 1.5,
});
