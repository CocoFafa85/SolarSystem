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
  near: 1e-7,       // LOT 12 — réduit pour zoomer au ras d'astres 1:1
  far: 1000,
  initialPosition: Object.freeze({ x: 0, y: 8, z: 20 }),
});

export const PIXEL_RATIO_CAP = 2;

/**
 * LOT 12 — Échelle 1:1 STRICTE.
 *
 * Les rayons des astres sont rendus à leur taille physique réelle (en UA),
 * sans amplification. Contrat pédagogique : « se rendre compte des ordres de
 * grandeur de l'espace ». Risque assumé : les astres sont sub-pixel à toute
 * vue d'ensemble ; les presets caméra `inner`/`system` et le focus BodyMenu
 * sont les seuls moyens de les voir.
 *
 * Historique : `PLANET_RADIUS_MULTIPLIER=500`, `STAR_RADIUS_MULTIPLIER=50`
 * (LOT 1→11) ont été ramenés à 1 pour ce refactor. `MIN_VISUAL_RADIUS_AU`
 * passe de 0.001 à 1e-9 (plancher numérique, évite divisions par zéro côté
 * RingSystem sans gonfler artificiellement les micro-corps).
 */
export const VISUAL_SCALE = Object.freeze({
  PLANET_RADIUS_MULTIPLIER: 1,
  STAR_RADIUS_MULTIPLIER: 1,
  MIN_VISUAL_RADIUS_AU: 1e-9,
});

/** Caméra : distances de focus relatives au rayon visuel de la cible. */
export const FOCUS = Object.freeze({
  // LOT 12 (révision utilisateur) — restauration des multiplicateurs pré-LOT 12
  // (6 / 4). À l'échelle 1:1, ces ratios préservent l'apparent angulaire :
  // visualRadius shrinké ×500 ET dist shrinké ×500 ⇒ angle = même qu'avant.
  // Le précédent 1000 (LOT 12 initial) éloignait trop la caméra.
  DISTANCE_MULTIPLIER: 6,
  STAR_DISTANCE_MULTIPLIER: 4,
  LERP_DURATION_SEC: 0.8,
  MIN_TARGET_DISTANCE: 1e-6,
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
