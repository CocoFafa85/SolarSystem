// glossarySvgs (LOT 10C) — bibliothèque d'illustrations SVG inline du glossaire.
// 38/38 templates, chacun avec une animation pédagogique cohérente.
// Stratégies :
//   - LOT 10C.2 : `<animateMotion>+<mpath>` pour les corps qui suivent
//     strictement l'orbite affichée (orbit, orbitalIncl, siderealYear).
//   - LOT 10C.3 : pattern « clip-path + translation horizontale » pour les
//     rotations 2D faciale (rotation, solstice, obliquity, solarDay).
//     Le cercle de l'astre reste FIXE ; un motif de surface translaté sous
//     un clip circulaire produit l'illusion d'un astre qui tourne face caméra.
//   - LOT 10C.1 : tous les SMIL sont armés `begin="indefinite"` côté JS
//     (cf. `GlossaryModal.js`) ; les animations ne jouent qu'au hover/focus.
//   - `@keyframes` namespacés `.glossary-svg .anim-*` (pause par défaut,
//     running au hover ; cf. components.css).
// Zéro-alloc en RAF : tout est string statique évaluée à l'init du module.

const NS = 'http://www.w3.org/2000/svg';

function svg(width, height, content) {
  return `<svg xmlns="${NS}" viewBox="0 0 ${width} ${height}" class="glossary-svg" aria-hidden="true">${content}</svg>`;
}

// --- Helpers de composition (factorisation transverse). ---
function _sun(cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffb86b" class="anim-pulse"/>`;
}
function _sunStatic(cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffb86b"/>`;
}
function _earth(cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#2a6fb0"/>`
       + `<path d="M${cx - r*0.5},${cy - r*0.2} q${r*0.3},${-r*0.2} ${r*0.6},${r*0.1} q${-r*0.2},${r*0.25} ${-r*0.5},${r*0.15} Z" fill="#3aa66a"/>`
       + `<circle cx="${cx + r*0.3}" cy="${cy + r*0.35}" r="${r*0.18}" fill="#3aa66a"/>`
       + `<circle cx="${cx - r*0.55}" cy="${cy + r*0.2}" r="${r*0.12}" fill="#3aa66a"/>`;
}
function _moon(cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#dcd4c4"/>`
       + `<circle cx="${cx - r*0.3}" cy="${cy - r*0.2}" r="${r*0.18}" fill="rgba(0,0,0,0.18)"/>`
       + `<circle cx="${cx + r*0.35}" cy="${cy + r*0.25}" r="${r*0.14}" fill="rgba(0,0,0,0.18)"/>`;
}
function _planet(cx, cy, r, color) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`
       + `<circle cx="${cx - r*0.35}" cy="${cy - r*0.35}" r="${r*0.55}" fill="rgba(255,255,255,0.18)"/>`;
}

// LOT 10C.3 — Pattern clip-path : astre fixe + détails de surface dupliqués
// dans une bande de largeur 2R qui translate de 0 à -2R, clipée par le disque.
// `details` doit dessiner le motif aux x ∈ [cx-r, cx+r] ; il est dupliqué
// décalé de +2r vers la droite pour boucler sans saut visuel.
function _surfaceScroll(cx, cy, r, dur, details, duplicateOffset) {
  const D = (duplicateOffset !== undefined) ? duplicateOffset : (r * 2);
  const cid = `clip-${cx}-${cy}-${r}-${dur}`;
  return `
    <defs><clipPath id="${cid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
    <g clip-path="url(#${cid})">
      <g>
        <animateTransform attributeName="transform" type="translate" from="0 0" to="${-D} 0" dur="${dur}s" repeatCount="indefinite"/>
        <g>${details}</g>
        <g transform="translate(${D} 0)">${details}</g>
      </g>
    </g>`;
}

// Anim SMIL helpers.
function _rotate(cx, cy, dur, content) {
  return `<g><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="${dur}s" repeatCount="indefinite"/>${content}</g>`;
}

const LIB = Object.freeze({

  // #1 orbit — LOT 10C.2 : animateMotion + mpath pour positionnement strict.
  orbit: () => svg(120, 80, `
    <defs>
      <path id="orbitPath" d="M 102 40 A 42 22 0 1 1 18 40 A 42 22 0 1 1 102 40 Z" fill="none"/>
    </defs>
    <use href="#orbitPath" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2"/>
    ${_sunStatic(60, 40, 10)}
      <circle cx="60" cy="40" r="12" fill="rgba(255,184,107,0.45)"/>
    <g>
      <circle cx="0" cy="0" r="4" fill="#a85a3a"/>
      <animateMotion dur="6s" repeatCount="indefinite"><mpath href="#orbitPath"/></animateMotion>
    </g>
  `),

  // #2 planet — Terre reconnaissable + nuages clippés qui défilent.
  planet: () => svg(120, 80, `
    <defs><clipPath id="pl-clip"><circle cx="60" cy="40" r="28"/></clipPath></defs>
    ${_earth(60, 40, 28)}
    <g clip-path="url(#pl-clip)">
      <g>
        <animateTransform attributeName="transform" type="translate" from="0 0" to="-56 0" dur="12s" repeatCount="indefinite"/>
        <ellipse cx="40" cy="32" rx="10" ry="3" fill="rgba(255,255,255,0.7)"/>
        <ellipse cx="68" cy="44" rx="14" ry="3.5" fill="rgba(255,255,255,0.6)"/>
        <ellipse cx="100" cy="36" rx="11" ry="3" fill="rgba(255,255,255,0.65)"/>
        <ellipse cx="96" cy="32" rx="10" ry="3" fill="rgba(255,255,255,0.7)"/>
        <ellipse cx="124" cy="44" rx="14" ry="3.5" fill="rgba(255,255,255,0.6)"/>
      </g>
    </g>
  `),

  // #3 star — Soleil + corona, pulse.
  star: () => svg(120, 80, `
    <circle cx="60" cy="40" r="32" fill="rgba(255,184,107,0.2)" class="anim-pulse"/>
    <circle cx="60" cy="40" r="24" fill="rgba(255,184,107,0.45)"/>
    ${_sun(60, 40, 18)}

  `),

  // #4 satellite — planète + lune qui orbite (SMIL rotate sur le moon).
  satellite: () => svg(120, 80, `
    <circle cx="50" cy="40" r="26" fill="none" stroke="currentColor" stroke-width="0.6" stroke-dasharray="2 2"/>
      ${_planet(50, 40, 14, '#a85a3a')}
      <circle cx="44" cy="36" r="2" fill="#7a3a22"/>
      <circle cx="54" cy="42" r="1.6" fill="#7a3a22"/>
      <circle cx="48" cy="46" r="1.2" fill="#7a3a22"/>
      ${_rotate(50, 40, 5, `<circle cx="76" cy="40" r="5" fill="#dcd4c4"/>`)}
  `),

  // #5 comet — noyau + 2 queues distinctes.
  comet: () => svg(120, 80, `
    ${_sunStatic(18, 50, 16)}
      <circle cx="18" cy="50" r="18" fill="rgba(255,184,107,0.45)"/>
    <circle cx="62" cy="40" r="3" fill="#fff"/>
    <path d="M 64 42 Q 90 56 116 62" stroke="#f4d27a" stroke-width="3.5" fill="none" opacity="0.85" stroke-linecap="round"/>
    <path d="M 64 42 Q 92 58 118 66" stroke="#f4d27a" stroke-width="1.6" fill="none" opacity="0.55" stroke-linecap="round"/>
    <path d="M 63 38 Q 80 32 96 28" stroke="#6ec7ff" stroke-width="1.6" fill="none" opacity="0.9" stroke-linecap="round" class="anim-flicker"/>
    <text x="90" y="74" font-size="6" fill="#f4d27a">poussière</text>
    <text x="80" y="22" font-size="6" fill="#6ec7ff">plasma</text>
  `),

  // #6 asteroid — un astéroïde polygonal marron, qui se déplace + tourne.
  asteroid: () => svg(120, 80, `
    <g>
      <animateTransform attributeName="transform" type="translate" from="-10 0" to="10 0" dur="6s" repeatCount="indefinite" additive="sum"/>
      <g transform="translate(60 40)">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="9s" repeatCount="indefinite" additive="sum"/>
        <polygon points="-14,-6 -8,-14 4,-12 14,-2 12,10 2,14 -10,10 -16,2" fill="#6b4a2b" stroke="#3e2a17" stroke-width="0.8"/>
        <circle cx="-4" cy="-2" r="2" fill="#3e2a17"/>
        <circle cx="6" cy="6" r="1.6" fill="#3e2a17"/>
        <circle cx="-8" cy="6" r="1.2" fill="#3e2a17"/>
      </g>
    </g>
  `),

  // #7 eclipse — LOT 10C.2 : Lune FIGÉE sur l'axe Soleil-Terre + rayons
  // lumineux issus du Soleil ; les 2 rayons axiaux sont coupés par la Lune.
  eclipse: () => svg(120, 80, `
    ${_sunStatic(30, 40, 16)}
      <circle cx="30" cy="40" r="18" fill="rgba(255,184,107,0.45)"/>
    <g stroke="#ffb86b" stroke-width="0.9" opacity="0.85">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite"/>
      <line x1="46" y1="40" x2="62" y2="40"/>      <!-- axial : stoppé avant la Lune -->
      <line x1="46" y1="38" x2="62" y2="36"/>      <!-- axial haut : stoppé -->
      <line x1="46" y1="42" x2="62" y2="44"/>      <!-- axial bas : stoppé -->
      <line x1="46" y1="30" x2="118" y2="14"/>     <!-- libre, passe au-dessus -->
      <line x1="46" y1="50" x2="118" y2="66"/>     <!-- libre, passe au-dessous -->
    </g>
    <circle cx="70" cy="40" r="6" fill="#444"/>
    <line x1="76" y1="40" x2="106" y2="40" stroke="rgba(0,0,0,0.45)" stroke-width="0.6" stroke-dasharray="2 2"/>
    <circle cx="110" cy="40" r="5" fill="#a85a3a"/>
  `),

  // #8 rotation — LOT 10C.3 : clip-path + bande de surface qui défile.
  // Astre fixe, pôles N/S statiques hors clip.
  rotation: () => svg(120, 80, `
    <line x1="60" y1="6" x2="60" y2="74" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
    <text x="54" y="10" font-size="7" fill="#fff">N</text>
    <text x="56" y="78" font-size="7" fill="#fff">S</text>
    ${_planet(60, 40, 22, '#3b6ea8')}
    ${_surfaceScroll(60, 40, 22, 5, `
      <path d="M 50 30 q 6 -6 14 0 q 8 4 10 12 q -6 4 -14 -2 q -6 0 -10 -10 Z" fill="#3aa66a"/>
      <circle cx="74" cy="48" r="3" fill="#3aa66a"/>
      <ellipse cx="56" cy="48" rx="3" ry="1.6" fill="#3aa66a"/>
    `, 44)}
    <circle cx="60" cy="18" r="2" fill="#fff"/>
    <circle cx="60" cy="62" r="2" fill="#fff"/>
  `),

  // #9 aphelion — Sun au foyer droit, planète au sommet GAUCHE (point le plus
  // éloigné du Soleil). Pulse sur le point.
  aphelion: () => svg(120, 80, `
    <ellipse cx="60" cy="40" rx="50" ry="22" fill="none" stroke="currentColor" stroke-width="1"/>
    ${_sunStatic(75, 40, 8)}
      <circle cx="75" cy="40" r="10" fill="rgba(255,184,107,0.45)"/>
    <circle cx="10" cy="40" r="4" fill="#a85a3a" class="anim-pulse"/>
  `),

  // #10 perihelion — Sun au foyer droit, planète au sommet DROIT (point
  // ellipse le plus proche du Soleil). Pulse sur le point.
  perihelion: () => svg(120, 80, `
    <ellipse cx="60" cy="40" rx="50" ry="22" fill="none" stroke="currentColor" stroke-width="1"/>
    ${_sunStatic(75, 40, 8)}
      <circle cx="75" cy="40" r="10" fill="rgba(255,184,107,0.45)"/>
    <circle cx="110" cy="40" r="4" fill="#a85a3a" class="anim-pulse"/>
  `),

  // #11 ecliptic — SEULE la Terre sur le plan ; autres planètes hors plan.
  ecliptic: () => svg(120, 80, `
    <line x1="0" y1="50" x2="120" y2="50" stroke="currentColor" stroke-width="1.2"/>
    ${_sunStatic(60, 50, 8)}
      <circle cx="60" cy="50" r="10" fill="rgba(255,184,107,0.45)"/>
    ${_earth(86, 50, 4)}
    <text x="86" y="64" font-size="6" fill="#3aa66a" text-anchor="middle">Terre</text>
    <circle cx="22" cy="30" r="2.4" fill="#cfa37a"/>
    <line x1="22" y1="32" x2="22" y2="50" stroke="currentColor" stroke-width="0.3" stroke-dasharray="1 1"/>
    <circle cx="38" cy="64" r="2.2" fill="#d97f5b"/>
    <line x1="38" y1="50" x2="38" y2="62" stroke="currentColor" stroke-width="0.3" stroke-dasharray="1 1"/>
    <circle cx="104" cy="34" r="2.6" fill="#cfa37a"/>
    <line x1="104" y1="36" x2="104" y2="50" stroke="currentColor" stroke-width="0.3" stroke-dasharray="1 1"/>
  `),

  // #12 equinox — LOT 10C.2 : pulse sur le cercle jaune RETIRÉ.
  equinox: () => svg(120, 80, `
    <ellipse cx="60" cy="40" rx="42" ry="20" fill="none" stroke="currentColor" stroke-width="0.6" stroke-dasharray="2 2"/>
    ${_sunStatic(60, 40, 10)}
      <circle cx="60" cy="40" r="12" fill="rgba(255,184,107,0.45)"/>
    ${_earth(102, 40, 6)}
    <path d="M 102 34 A 6 6 0 0 1 102 46 Z" fill="rgba(0,0,0,0.6)"/>
    <line x1="102" y1="32" x2="102" y2="48" stroke="#ffb86b" stroke-width="1"/>
  `),

  // #13 solstice — LOT 10C.3 : axe incliné fixe hors clip + bande clipée
  // bichrome qui défile (illusion du jour qui passe sous l'axe incliné).
  solstice: () => svg(120, 80, `
    ${_sunStatic(20, 40, 18)}
      <circle cx="20" cy="40" r="20" fill="rgba(255,184,107,0.45)"/>
    ${_earth(80, 40, 22)}
    ${_surfaceScroll(80, 40, 22, 6, `
      <rect x="58" y="18" width="22" height="44" fill="rgba(0,0,0,0.55)"/>
    `, 44)}
    <g transform="rotate(23.44 80 40)">
      <line x1="80" y1="14" x2="80" y2="66" stroke="#ffb86b" stroke-width="1.2"/>
      <text x="80" y="12" font-size="7" fill="#ffffff" text-anchor="middle">N</text>
      <text x="80" y="74" font-size="7" fill="#ffffff" text-anchor="middle">S</text>
    </g>
    <text x="60" y="17" font-size="6" fill="currentColor" text-anchor="middle">Hiver</text>
    <text x="60" y="65" font-size="6" fill="currentColor" text-anchor="middle">Été</text>
  `),

  // #14 orbitalIncl — LOT 10C.2 : animateMotion sur path inclined ellipse.
  // Path bake : ellipse rx=50 ry=8 centrée (60,50), rotation -18° autour de (60,50).
  inclination: () => svg(120, 80, `
    <defs>
      <path id="inclPath" d="M 107.55 34.55 A 50 8 -18 1 1 12.45 65.45 A 50 8 -18 1 1 107.55 34.55 Z" fill="none"/>
    </defs>
    <ellipse cx="60" cy="50" rx="50" ry="8" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2"/>
    <use href="#inclPath" stroke="#ff8859" stroke-width="1" fill="none"/>
    ${_sunStatic(60, 50, 5)}
      <circle cx="60" cy="50" r="7" fill="rgba(255,184,107,0.45)"/>
    <g>
      <circle cx="0" cy="0" r="3" fill="#a85a3a"/>
      <animateMotion dur="8s" repeatCount="indefinite"><mpath href="#inclPath"/></animateMotion>
    </g>
  `),

  // #15 obliquity — LOT 10C.3 : axe 23,44° fixe hors clip + bande surface clipée.
  obliquity: () => svg(120, 80, `
    <line x1="10" y1="60" x2="110" y2="60" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
    <line x1="60" y1="62" x2="60" y2="6" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1 2"/>
    ${_earth(60, 40, 26)}
    ${_surfaceScroll(60, 40, 26, 7, `
      <ellipse cx="50" cy="34" rx="6" ry="3" fill="rgba(255,255,255,0.25)"/>
      <ellipse cx="70" cy="48" rx="7" ry="2.5" fill="rgba(255,255,255,0.22)"/>
      <ellipse cx="42" cy="50" rx="4" ry="2" fill="rgba(255,255,255,0.2)"/>
    `, 52)}
    <g transform="rotate(23.44 60 40)">
      <line x1="60" y1="8" x2="60" y2="72" stroke="#ffb86b" stroke-width="1.8"/>
      <circle cx="60" cy="12" r="2.2" fill="#fff"/>
      <circle cx="60" cy="68" r="2.2" fill="#fff"/>
    </g>
    <text x="92" y="20" font-size="8" fill="#ffb86b">23,44°</text>
  `),

  // #16 perigee — LOT 10C.2 : Terre au foyer droit, satellite au point ellipse
  // LE PLUS PROCHE (sommet droit). Repère pulse, satellite immobile.
  perigee: () => svg(120, 80, `
    <ellipse cx="60" cy="40" rx="48" ry="20" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2"/>
      ${_planet(75, 40, 14, '#a85a3a')}
      <circle cx="69" cy="36" r="2" fill="#7a3a22"/>
      <circle cx="79" cy="42" r="1.6" fill="#7a3a22"/>
      <circle cx="73" cy="46" r="1.2" fill="#7a3a22"/>
    <circle cx="108" cy="40" r="4" fill="#dcd4c4"/>
  `),

  // #17 apogee — LOT 10C.2 : Terre au foyer droit, satellite au point ellipse
  // LE PLUS ÉLOIGNÉ (sommet gauche). Repère pulse, satellite immobile.
  apogee: () => svg(120, 80, `
    <ellipse cx="60" cy="40" rx="48" ry="20" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2"/>
      ${_planet(75, 40, 14, '#a85a3a')}
      <circle cx="69" cy="36" r="2" fill="#7a3a22"/>
      <circle cx="79" cy="42" r="1.6" fill="#7a3a22"/>
      <circle cx="73" cy="46" r="1.2" fill="#7a3a22"/>
    <circle cx="12" cy="40" r="4" fill="#dcd4c4"/>
  `),

  // #18 solarFlare — arche de plasma + flicker.
  solarFlare: () => svg(120, 80, `
    <g class="anim-flicker">
      ${_sunStatic(50, 44, 22)}
        <circle cx="50" cy="44" r="24" fill="rgba(255,184,107,0.45)"/>
      <path d="M 65 32 Q 90 8 102 32" stroke="#ff6b6b" stroke-width="2.5" fill="none"/>
      <path d="M 68 28 Q 88 14 96 28" stroke="#ffb86b" stroke-width="1.4" fill="none"/>
      <path d="M 60 22 Q 76 4 92 18" stroke="#ff8d3a" stroke-width="1.2" fill="none" opacity="0.7"/>
    </g>
  `),

  // #19 supermoon — alternance Lune proche / lointaine.
  supermoon: () => svg(120, 80, `
    <circle cx="60" cy="40" r="8" fill="#f0ebe1">
      <animate attributeName="r" values="6;14;6" dur="4s" repeatCount="indefinite"/>
    </circle>
  `),

  // #20 transit — petit corps traverse devant le Soleil STATIQUE.
  transit: () => svg(120, 80, `
    ${_sunStatic(60, 40, 22)}
      <circle cx="60" cy="40" r="24" fill="rgba(255,184,107,0.45)"/>
    <g>
      <circle cx="0" cy="40" r="3" fill="#000"/>
      <animateTransform attributeName="transform" type="translate" from="36 0" to="84 0" dur="5s" repeatCount="indefinite"/>
    </g>
  `),

  // #21 conjunction — alignement, Terre distincte.
  conjunction: () => svg(120, 80, `
    <line x1="10" y1="40" x2="110" y2="40" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
    ${_sunStatic(18, 40, 8)}
      <circle cx="18" cy="40" r="10" fill="rgba(255,184,107,0.45)"/>
    <circle cx="60" cy="40" r="2.5" fill="#cfa37a"/>
    ${_earth(102, 40, 6)}
  `),

  // #22 opposition — Terre ENTRE Soleil et planète extérieure.
  opposition: () => svg(120, 80, `
    <line x1="10" y1="40" x2="110" y2="40" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
    ${_sunStatic(18, 40, 8)}
          <circle cx="18" cy="40" r="10" fill="rgba(255,184,107,0.45)"/>
    ${_earth(60, 40, 6)}
    <circle cx="102" cy="40" r="4" fill="#d97f5b"/>
  `),

  // #23 libration — Lune oscille (~3s).
  libration: () => svg(120, 80, `
    ${_earth(20, 40, 12)}
    <g class="anim-libration" style="transform-origin:80px 40px">
      ${_moon(80, 40, 13)}
    </g>
  `),

  // #24 tide — renflements pulsants.
  tide: () => svg(120, 80, `
    <ellipse cx="60" cy="40" rx="28" ry="20" fill="#6aa8ff" opacity="0.45">
      <animate attributeName="rx" values="26;32;26" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="ry" values="22;18;22" dur="3s" repeatCount="indefinite"/>
    </ellipse>
    ${_earth(60, 40, 20)}
    <circle cx="105" cy="40" r="6" fill="#dcd4c4"/>
  `),

  // #25 au — LOT 10C.2 : Soleil à gauche, Terre à droite, règle + label.
  ruler: () => svg(120, 80, `
    <line x1="20" y1="40" x2="100" y2="40" stroke="currentColor" stroke-width="1.6"/>
    <line x1="20" y1="34" x2="20" y2="46" stroke="currentColor" stroke-width="1.4"/>
    <line x1="100" y1="34" x2="100" y2="46" stroke="currentColor" stroke-width="1.4"/>
    ${_sun(20, 40, 8)}
      <circle cx="20" cy="40" r="10" fill="rgba(255,184,107,0.45)"/>
    ${_earth(100, 40, 5)}
    <text x="60" y="60" font-size="7" fill="currentColor" text-anchor="middle">≈ 149,6 M km</text>
  `),

  // #26 lightYear — rayon lumineux qui traverse.
  lightYear: () => svg(120, 80, `
    <circle cx="12" cy="40" r="4" fill="#ffb86b"/>
    <circle cx="12" cy="40" r="6" fill="rgba(255,184,107,0.45)"/>
    <circle cx="108" cy="40" r="3" fill="#cfd2d8"/>
    <g>
      <line x1="0" y1="40" x2="16" y2="40" stroke="#fff8a8" stroke-width="2"/>
      <animateTransform attributeName="transform" type="translate" from="0 0" to="100 0" dur="2.4s" repeatCount="indefinite"/>
    </g>
    <text x="60" y="62" font-size="7" fill="currentColor" text-anchor="middle">Une année-lumière</text>
  `),

  // #27 parsec — oscillation parallaxe.
  parsec: () => svg(120, 80, `
    <circle cx="100" cy="40" r="2.5" fill="#fff"/>
    <circle cx="20" cy="40" r="3" fill="#d97f5b"/>
    <g>
      <line x1="20" y1="40" x2="100" y2="40" stroke="#ffb86b" stroke-width="0.6" stroke-dasharray="2 2"/>
      <animateTransform attributeName="transform" type="rotate" values="-2 100 40; 2 100 40; -2 100 40" dur="3s" repeatCount="indefinite"/>
    </g>
    <text x="60" y="60" font-size="7" fill="currentColor" text-anchor="middle">parallaxe</text>
  `),

  // #28 j2000 — LOT 10C.2 : cadran figé 12h00, AUCUNE animation.
  j2000: () => svg(120, 80, `
    <circle cx="60" cy="40" r="22" fill="none" stroke="currentColor" stroke-width="1"/>
    <line x1="60" y1="40" x2="60" y2="20" stroke="currentColor" stroke-width="1.6"/>
    <line x1="60" y1="40" x2="60" y2="24" stroke="#6aa8ff" stroke-width="1.4"/>
    <circle cx="60" cy="40" r="3" fill="#ffb86b"/>
  `),

  // #29 epoch — LOT 10C.2 : repère générique statique, AUCUNE animation.
  epoch: () => svg(120, 80, `
    <circle cx="60" cy="40" r="22" fill="none" stroke="currentColor" stroke-width="1"/>
    <line x1="60" y1="40" x2="60" y2="24" stroke="currentColor" stroke-width="1.6"/>
    <line x1="60" y1="40" x2="76" y2="40" stroke="#6aa8ff" stroke-width="1.4"/>
    <circle cx="60" cy="40" r="1.6" fill="#ffb86b"/>
  `),

  // #30 siderealYear — LOT 10C.2 : animateMotion strict + PAUSE 15 % en fin
  // de cycle (keyTimes 0;0.85;1, keyPoints 0;1;1). Point « étoile » RETIRÉ.
  siderealYear: () => svg(120, 80, `
    <defs>
      <path id="sidPath" d="M 102 40 A 42 20 0 1 1 18 40 A 42 20 0 1 1 102 40 Z" fill="none"/>
    </defs>
    <use href="#sidPath" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2" fill="none"/>
    ${_sunStatic(60, 40, 8)}
      <circle cx="60" cy="40" r="10" fill="rgba(255,184,107,0.45)"/>
    <g>
      ${_planet(0, 0, 4, '#d97f5b')}
      <animateMotion dur="6s" repeatCount="indefinite" keyTimes="0;0.85;1" keyPoints="0;1;1" calcMode="linear">
        <mpath href="#sidPath"/>
      </animateMotion>
    </g>
  `),

  // #31 solarDay — LOT 10C.3 : bande bichrome (jour/nuit) défile sous le clip.
  day: () => svg(120, 80, `
    <circle cx="60" cy="40" r="22" fill="#1a2740"/>
    ${_surfaceScroll(60, 40, 22, 5, `
      <rect x="38" y="18" width="22" height="44" fill="#a85a3a"/>
      <circle cx="40" cy="36" r="2" fill="#7a3a22"/>
      <circle cx="50" cy="42" r="1.6" fill="#7a3a22"/>
      <circle cx="44" cy="46" r="1.2" fill="#7a3a22"/>
      <rect x="60" y="18" width="22" height="44" fill="#1a2740"/>
    `, 44)}
  `),

  // #32 dwarfPlanet — corps + voisinage encombré, flotte (translation Y).
  dwarfPlanet: () => svg(120, 80, `
    <g class="anim-float">
      ${_planet(60, 40, 12, '#b48a64')}
      <g fill="#7a6b58">
        <circle cx="34" cy="32" r="2"/>
        <circle cx="42" cy="50" r="1.6"/>
        <circle cx="80" cy="28" r="2.2"/>
        <circle cx="88" cy="50" r="1.4"/>
        <circle cx="96" cy="40" r="2"/>
        <circle cx="28" cy="44" r="1.2"/>
        <circle cx="76" cy="54" r="1.8"/>
      </g>
    </g>
  `),

  // #33 gasGiant — bandes + anneau ténu, flotte.
  gasGiant: () => svg(120, 80, `
    <defs><clipPath id="gg-clip"><circle cx="60" cy="40" r="26"/></clipPath></defs>
    <g class="anim-float">
      <circle cx="60" cy="40" r="26" fill="#cfa37a"/>
      <g clip-path="url(#gg-clip)" stroke-width="3" fill="none">
        <line x1="34" y1="30" x2="86" y2="30" stroke="#a07a52"/>
        <line x1="34" y1="38" x2="86" y2="38" stroke="#e8c39a"/>
        <line x1="34" y1="46" x2="86" y2="46" stroke="#a07a52"/>
        <line x1="34" y1="54" x2="86" y2="54" stroke="#cfa37a"/>
      </g>
      <ellipse cx="60" cy="40" rx="40" ry="4" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.5"/>
    </g>
  `),

  // #34 iceGiant — axe quasi-couché + anneau perpendiculaire, flotte.
  iceGiant: () => svg(120, 80, `
    <g class="anim-float">
      ${_planet(60, 40, 22, '#8fd6d2')}
      <g transform="rotate(82 60 40)">
        <line x1="60" y1="10" x2="60" y2="70" stroke="#fff" stroke-width="1" opacity="0.7"/>
        <ellipse cx="60" cy="40" rx="32" ry="4" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.6"/>
      </g>
    </g>
  `),

  // #35 telluric — rocheuse compacte, flotte.
  telluric: () => svg(120, 80, `
    <g class="anim-float">
      ${_planet(60, 40, 14, '#a85a3a')}
      <circle cx="54" cy="36" r="2" fill="#7a3a22"/>
      <circle cx="64" cy="42" r="1.6" fill="#7a3a22"/>
      <circle cx="58" cy="46" r="1.2" fill="#7a3a22"/>
    </g>
  `),

  // #36 asteroidBelt — essaim non rigide : rotation autour du Soleil statique
  // (alternative clip-path documentée mais non retenue : points = essaim).
  asteroidBelt: (() => {
    // LOT 10D — chaque point sur SA propre orbite circulaire (rayon unique
    // par point). La rotation du groupe fait donc orbiter chaque point sur
    // son cercle au lieu d'une rotation d'ensemble elliptique parasite.
    const COLORS = ['#5a4d3f', '#6b5e4f', '#3a3128', '#8a7a63'];
    const N = 36;
    let body = '';
    let seed = 1337;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const R = 18 + rnd() * 14;            // 18..32 — bande circulaire jittered
      const x = (60 + Math.cos(a) * R).toFixed(1);
      const y = (40 + Math.sin(a) * R).toFixed(1);
      const r = (0.7 + rnd() * 1.4).toFixed(1);
      const c = COLORS[i & 3];
      body += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
    }
    return () => svg(120, 80, `
      <circle cx="60" cy="40" r="25" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1 2" opacity="0.5"/>
      ${_rotate(60, 40, 20, body)}
      ${_sunStatic(60, 40, 6)}
        <circle cx="60" cy="40" r="8" fill="#ffb86b73"/>
    `);
  })(),

  // #37 kuiperBelt — semis clairsemé, rotation plus lente (~40s).
  kuiperBelt: (() => {
    // LOT 10D — bande circulaire (chaque point sur son cercle).
    const N = 12;
    let body = '';
    let seed = 9001;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
      const R = 30 + rnd() * 7;             // 30..37 — bande externe
      const x = (60 + Math.cos(a) * R).toFixed(1);
      const y = (40 + Math.sin(a) * R).toFixed(1);
      body += `<circle cx="${x}" cy="${y}" r="1.4" fill="#5a4d3f"/>`;
    }
    return () => svg(120, 80, `
      <circle cx="60" cy="40" r="33" fill="none" stroke="#ffc48573" stroke-width="0.6" stroke-dasharray="2 1" opacity="0.6"/>
      ${_rotate(60, 40, 40, body)}
      ${_sunStatic(60, 40, 4)}
        <circle cx="60" cy="40" r="6" fill="rgba(255,184,107,0.45)"/>
    `);
  })(),

  // #38 oortCloud — sphère 360° autour du Soleil, rotation lente (~60s).
  oortCloud: (() => {
    const N = 80;
    let body = '';
    let seed = 7919;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
    // LOT 10D — chaque point sur SA propre orbite circulaire (rayon unique).
    // La rotation d'ensemble fait orbiter chaque point sur son cercle propre.
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2;
      const R = 26 + rnd() * 22;            // 14..36 — sphère projetée
      const x = (60 + Math.cos(a) * R).toFixed(1);
      const y = (40 + Math.sin(a) * R).toFixed(1);
      const rRel = (R - 14) / 22;           // 0..1 — pour taille/opacity
      const sz = (0.5 + (1 - rRel) * 1.6).toFixed(1);
      const op = (0.3 + rRel * 0.6).toFixed(2);
      body += `<circle cx="${x}" cy="${y}" r="${sz}" fill="#cfd2d8" opacity="${op}"/>`;
    }
    return () => svg(120, 80, `
      <circle cx="60" cy="40" r="36" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.4"/>
      ${_rotate(60, 40, 60, body)}
      ${_sunStatic(60, 40, 1.6)}
        <circle cx="60" cy="40" r="2" fill="rgba(255,184,107,0.45)"/>
    `);
  })(),
});

export function renderGlossarySvg(name) {
  const fn = LIB[name];
  return fn ? fn() : '';
}

export function hasGlossarySvg(name) { return Boolean(LIB[name]); }
