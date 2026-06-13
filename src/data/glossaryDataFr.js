// LOT 10 — Source statique du glossaire FR. 100 % overlay SVG.
// Décision LOT 10 : `sceneCamera` abandonné (animations 3D imprécises et
// distrayantes). Tous les termes pointent vers un schéma SVG inline rendu
// par `src/ui/components/glossarySvgs.js` (LIB).
//
// Mapping LOT 10.D1 (sceneCamera → overlay) :
//   orbit→ellipse · planet→planet · star→sun · satellite→satellite ·
//   comet→comet · rotation→rotation · equinox→equinox · solstice→solstice ·
//   solarFlare→solarFlare · supermoon→supermoon · libration→libration ·
//   siderealYear→siderealYear · dwarfPlanet→dwarfPlanet · gasGiant→gasGiant ·
//   iceGiant→iceGiant · telluric→telluric.
//
// Schéma `animation` :
//   { kind: 'overlay', svg: <svgKey ∈ OVERLAY_SVG_KEYS> }
//
// Validateur : tests/glossary.schema.test.js

// LOT 10 — conservés pour rétro-compatibilité du validateur de schéma et
// pour signaler les marqueurs/presets côté contrôleurs (zéro utilisation
// active depuis l'abandon de sceneCamera).
export const SCENE_MARKER_IDS = Object.freeze([
  'vernalEquinox',
  'summerSolstice',
  'autumnalEquinox',
  'winterSolstice',
]);

export const SCENE_PRESET_IDS = Object.freeze(['system', 'inner', 'outer']);

// LOT 10B — 38 clés alignées 1:1 sur LIB de glossarySvgs.js.
// Chaque clé pointe vers un template SVG dédié (plus de partage via 'ellipse'
// ou 'ruler' — les spécifications LOT 10B.5 imposent l'unicité).
export const OVERLAY_SVG_KEYS = Object.freeze([
  'orbit', 'planet', 'star', 'satellite', 'comet', 'asteroid', 'eclipse',
  'rotation', 'aphelion', 'perihelion', 'ecliptic', 'equinox', 'solstice',
  'inclination', 'obliquity', 'perigee', 'apogee', 'solarFlare', 'supermoon',
  'transit', 'conjunction', 'opposition', 'libration', 'tide',
  'ruler', 'lightYear', 'parsec', 'j2000', 'epoch', 'siderealYear', 'day',
  'dwarfPlanet', 'gasGiant', 'iceGiant', 'telluric',
  'asteroidBelt', 'kuiperBelt', 'oortCloud',
]);

const terms = [
  { id: 'orbit',         term: 'Orbite',                def: "Trajectoire fermée d'un corps autour d'un foyer gravitationnel.",
    animation: { kind: 'overlay', svg: 'orbit' } },
    
  { id: 'planet',        term: 'Planète',               def: "Corps sphérique en orbite autour d'une étoile, ayant nettoyé son voisinage.",
    animation: { kind: 'overlay', svg: 'planet' } },
    
  { id: 'star',          term: 'Étoile',                def: 'Sphère de gaz auto-gravitante où la fusion nucléaire produit énergie et rayonnement.',
    animation: { kind: 'overlay', svg: 'star' } },
    
  { id: 'satellite',     term: 'Satellite naturel',     def: "Corps en orbite autour d'une planète ou d'une planète naine.",
    animation: { kind: 'overlay', svg: 'satellite' } },
    
  { id: 'comet',         term: 'Comète',                def: 'Petit corps glacé qui développe une queue de poussière et de plasma près du Soleil.',
    animation: { kind: 'overlay', svg: 'comet' } },
    
  { id: 'asteroid',      term: 'Astéroïde',             def: 'Petit corps rocheux ou métallique non actif gravitant principalement entre Mars et Jupiter.',
    animation: { kind: 'overlay', svg: 'asteroid' } },
    
  { id: 'eclipse',       term: 'Éclipse',               def: "Alignement projetant l'ombre d'un corps sur un autre (solaire ou lunaire).",
    animation: { kind: 'overlay', svg: 'eclipse' } },
    
  { id: 'rotation',      term: 'Rotation',              def: "Mouvement d'un corps autour de son propre axe — donne le jour.",
    animation: { kind: 'overlay', svg: 'rotation' } },
    
  { id: 'aphelion',      term: 'Aphélie',               def: "Point de l'orbite le plus éloigné du Soleil.",
    animation: { kind: 'overlay', svg: 'aphelion' } },
    
  { id: 'perihelion',    term: 'Périhélie',             def: "Point de l'orbite le plus proche du Soleil.",
    animation: { kind: 'overlay', svg: 'perihelion' } },
    
  { id: 'ecliptic',      term: 'Écliptique',            def: "Plan de l'orbite terrestre, référence pour mesurer les inclinaisons.",
    animation: { kind: 'overlay', svg: 'ecliptic' } },
    
  { id: 'equinox',       term: 'Équinoxe',              def: 'Instant où jour et nuit ont une durée quasi égale partout sur Terre.',
    animation: { kind: 'overlay', svg: 'equinox' } },
    
  { id: 'solstice',      term: 'Solstice',              def: "Instant où l'axe terrestre est incliné au maximum vers (été) ou contre (hiver) le Soleil.",
    animation: { kind: 'overlay', svg: 'solstice' } },
    
  { id: 'orbitalIncl',   term: 'Inclinaison orbitale',  def: "Angle entre le plan orbital d'un corps et un plan de référence (souvent l'écliptique).",
    animation: { kind: 'overlay', svg: 'inclination' } },
    
  { id: 'obliquity',     term: 'Obliquité',             def: "Inclinaison de l'axe de rotation d'un corps par rapport à la perpendiculaire de son plan orbital.",
    animation: { kind: 'overlay', svg: 'obliquity' } },
    
  { id: 'perigee',       term: 'Périgée',               def: "Point de l'orbite d'un satellite le plus proche de son corps central (Terre pour la Lune).",
    animation: { kind: 'overlay', svg: 'perigee' } },
    
  { id: 'apogee',        term: 'Apogée',                def: "Point de l'orbite d'un satellite le plus éloigné de son corps central.",
    animation: { kind: 'overlay', svg: 'apogee' } },
    

  { id: 'solarFlare',    term: 'Éruption solaire',      def: "Émission soudaine et intense de rayonnement lors d'une reconfiguration magnétique solaire.",
    animation: { kind: 'overlay', svg: 'solarFlare' } },
    
  { id: 'supermoon',     term: 'Super-Lune',            def: 'Pleine Lune au périgée — diamètre apparent et luminosité maximaux.',
    animation: { kind: 'overlay', svg: 'supermoon' } },
    
  { id: 'transit',       term: 'Transit',               def: "Passage d'un corps devant un autre vu depuis un observateur (Mercure ou Vénus devant le Soleil).",
    animation: { kind: 'overlay', svg: 'transit' } },
    
  { id: 'conjunction',   term: 'Conjonction',           def: 'Alignement apparent de deux corps dans le ciel vus depuis la Terre.',
    animation: { kind: 'overlay', svg: 'conjunction' } },
    
  { id: 'opposition',    term: 'Opposition',            def: 'Configuration où la Terre se trouve entre le Soleil et une planète extérieure.',
    animation: { kind: 'overlay', svg: 'opposition' } },
    
  { id: 'libration',     term: 'Libration',             def: 'Oscillations apparentes de la Lune qui révèlent ≈ 59 % de sa surface depuis la Terre.',
    animation: { kind: 'overlay', svg: 'libration' } },
    
  { id: 'tide',          term: 'Marée',                 def: 'Déformation gravitationnelle (Lune + Soleil) causant la montée/descente du niveau des océans.',
    animation: { kind: 'overlay', svg: 'tide' } },
    

  { id: 'au',            term: 'Unité astronomique',    def: 'Distance moyenne Terre-Soleil : ≈ 149,6 millions de km.',
    animation: { kind: 'overlay', svg: 'ruler' } },
    
  { id: 'lightYear',     term: 'Année-lumière',         def: 'Distance parcourue par la lumière en un an : ≈ 9,46×10¹² km.',
    animation: { kind: 'overlay', svg: 'lightYear' } },
    
  { id: 'parsec',        term: 'Parsec',                def: "Distance ≈ 3,26 années-lumière, basée sur la parallaxe annuelle d'une seconde d'arc.",
    animation: { kind: 'overlay', svg: 'parsec' } },
    
  { id: 'j2000',         term: 'J2000.0',               def: 'Époque de référence : 1ᵉʳ janvier 2000 à 12h00 TT — point zéro de cette simulation.',
    animation: { kind: 'overlay', svg: 'epoch' } },
    
  { id: 'epoch',         term: 'Époque',                def: "Instant de référence auquel sont donnés les éléments orbitaux d'un corps.",
    animation: { kind: 'overlay', svg: 'epoch' } },
    
  { id: 'siderealYear',  term: 'Année sidérale',        def: "Durée d'une révolution complète de la Terre par rapport aux étoiles : ≈ 365,256 jours.",
    animation: { kind: 'overlay', svg: 'siderealYear' } },
    
  { id: 'solarDay',      term: 'Jour solaire',          def: 'Durée entre deux passages successifs du Soleil au méridien : 24 h (vs 23 h 56 min sidéral).',
    animation: { kind: 'overlay', svg: 'day' } },
    

  { id: 'dwarfPlanet',   term: 'Planète naine',         def: "Corps sphérique en orbite solaire qui n'a PAS nettoyé son voisinage (Cérès, Pluton, Hauméa, Makémaké, Éris).",
    animation: { kind: 'overlay', svg: 'dwarfPlanet' } },
    
  { id: 'gasGiant',      term: 'Géante gazeuse',        def: "Planète massive principalement composée d'hydrogène et d'hélium (Jupiter, Saturne).",
    animation: { kind: 'overlay', svg: 'gasGiant' } },
    
  { id: 'iceGiant',      term: 'Géante de glace',       def: 'Planète géante riche en eau, méthane, ammoniac sous forme glacée (Uranus, Neptune).',
    animation: { kind: 'overlay', svg: 'iceGiant' } },
    
  { id: 'telluric',      term: 'Planète tellurique',    def: 'Planète rocheuse dense à surface solide (Mercure, Vénus, Terre, Mars).',
    animation: { kind: 'overlay', svg: 'telluric' } },
    
  { id: 'asteroidBelt',  term: "Ceinture d'astéroïdes", def: "Région entre Mars et Jupiter peuplée d'astéroïdes (≈ 1 à 200 km).",
    animation: { kind: 'overlay', svg: 'asteroidBelt' } },
    
  { id: 'kuiperBelt',    term: 'Ceinture de Kuiper',    def: 'Disque de petits corps au-delà de Neptune (≈ 30-55 UA), où vit Pluton.',
    animation: { kind: 'overlay', svg: 'kuiperBelt' } },
    
  { id: 'oortCloud',     term: "Nuage d'Oort",          def: 'Sphère hypothétique de comètes dormantes à ~50 000 UA, frontière du système solaire.',
    animation: { kind: 'overlay', svg: 'oortCloud' } },
    
];

export default { terms };
