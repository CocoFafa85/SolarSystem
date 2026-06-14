// Canaux de l'EventBus — contrat unique UI <-> moteur 3D.

export const UI = Object.freeze({
  // Temps
  TIME_PLAY:        'ui:time:play',
  TIME_PAUSE:       'ui:time:pause',
  TIME_TOGGLE:      'ui:time:toggle',
  TIME_SET_SPEED:   'ui:time:setSpeed',
  TIME_STEP_SPEED:  'ui:time:stepSpeed',
  TIME_RESET:       'ui:time:reset',         // LOT 5 — chrono à zéro

  // Vue / caméra
  VIEW_FOCUS:       'ui:view:focus',         // { id }
  VIEW_HOVER:       'ui:view:hover',         // { id|null } — survol BodyMenu
  VIEW_RESET:       'ui:view:reset',
  VIEW_PRESET:      'ui:view:preset',        // LOT 5 — { preset: 'system'|'ecliptic'|'inner' }

  // Orbites & visibilité
  ORBITS_TOGGLE:           'ui:orbits:toggle',         // legacy / global
  ORBITS_TOGGLE_PLANETS:   'ui:orbits:togglePlanets',  // LOT 5 — planètes + Lune + repères
  ORBITS_TOGGLE_DWARFS:    'ui:orbits:toggleDwarfs',   // LOT 6 — planètes naines
  ORBITS_TOGGLE_SATELLITES:'ui:orbits:toggleSatellites', // LOT 16 — satellites (Lune)
  ORBITS_TOGGLE_MINOR:     'ui:orbits:toggleMinor',    // LOT 5 — comètes + astéroïdes

  // Survol d'un marqueur saisonnier (équinoxe/solstice). LOT 6.
  MARKER_HOVER:            'ui:marker:hover',          // { id: 'vernalEquinox'|...|null }
  // Survol direct du MESH 3D d'un astre dans la scène (LOT 8).
  BODY_MESH_HOVER:         'ui:body:meshHover',        // { id|null }
  // Survol d'une orbite. LOT 7. Payload : { id, x, y } | { id: null }
  ORBIT_HOVER:             'ui:orbit:hover',
  // LOT 9 — survol BodyMenu : brillance d'orbite SANS mouvement caméra.
  // Distinct de UI.VIEW_HOVER (glossaire), distinct de UI.ORBIT_HOVER (raycaster).
  // Payload : { id } | { id: null }
  ORBIT_HIGHLIGHT:         'ui:orbit:highlight',
  // Glossaire (LOT 7) — pilotage des animations pédagogiques.
  GLOSSARY_OPEN:           'ui:glossary:open',
  GLOSSARY_CLOSE:          'ui:glossary:close',
  GLOSSARY_ANIMATE:        'ui:glossary:animate',      // { kind, termId, payload? }
  // LOT 8C — canal dédié glossaire, distinct de VIEW_PRESET/VIEW_HOVER pour
  // ne polluer NI le PoV NI le mode preview du BodyMenu.
  // Payload : { target?: bodyId, preset?: 'system'|'inner'|'outer' } | { target:null }
  GLOSSARY_PREVIEW:        'ui:glossary:preview',
  SUN_TOGGLE:              'ui:sun:toggle',

  // Panneaux génériques
  PANEL_OPEN:       'ui:panel:open',
  PANEL_CLOSE:      'ui:panel:close',

  // Corps célestes
  BODY_SELECT:      'ui:body:select',
  COMPARE_SHOW:     'ui:compare:show',
  COMPARE_HIDE:     'ui:compare:hide',
  COMPARE_MENU_TOGGLE: 'ui:compare:menuToggle',        // LOT 5 — toggle menu trier

  // Événements
  EVENTS_TOGGLE:    'ui:events:toggle',
  EVENTS_RESET:     'ui:events:reset',

  // HUD global
  HUD_TOGGLE:       'ui:hud:toggle',                   // LOT 5 — masquer/afficher interface

  // Modale d'accueil (LOT 10) — montage unique dans slots.app, toggle via hidden.
  WELCOME_OPEN:     'ui:welcome:open',
  WELCOME_CLOSE:    'ui:welcome:close',

  // LOT 11 — hint UX au changement de mode caméra. Émis par CameraControls
  // sur première activation turntable. Payload : { mode: 'turntable'|'free' }.
  CAMERA_MODE_HINT: 'ui:camera:modeHint',
});

export const ENGINE = Object.freeze({
  READY:            'engine:ready',
  TICK:             'engine:tick',
  TIME_CHANGED:     'engine:time:changed',
  BODY_SELECTED:    'engine:body:selected',
  SUN_VISIBILITY:   'engine:sun:visibility',
  EVENT_DETECTED:    'engine:event:detected',
  SOLAR_FLARE_START: 'engine:flare:start',
  SOLAR_FLARE_END:   'engine:flare:end',
  // LOT 5C — relais "scène à plat" consommé par motionUpdater, asteroidBeltUpdater,
  // EclipseTracker, etc. Émis par TimeService sur UI.TIME_RESET. Aucun payload.
  SCENE_RESET:       'engine:scene:reset',
});

export const EVENT_TYPES = Object.freeze({
  solarEclipse:  { i18n: 'events.types.solarEclipse',  accent: '#000000', kind: 'eclipse-solar', tooltip: 'events.tooltips.solarEclipse' },
  lunarEclipse:  { i18n: 'events.types.lunarEclipse',  accent: '#ff7a4d', kind: 'eclipse-lunar', tooltip: 'events.tooltips.lunarEclipse' },
  superMoon:     { i18n: 'events.types.superMoon',     accent: '#cfd2d8', kind: 'moon',    tooltip: 'events.tooltips.superMoon' },
  solarFlare:    { i18n: 'events.types.solarFlare',    accent: '#ff6b6b', kind: 'flare',   tooltip: 'events.tooltips.solarFlare' },
});

// Presets de caméra exposés par PoVMenu (le moteur consomme la string).
// LOT 5B : 'ecliptic' supprimé au profit de 'outer' — vue contre-plongée
// depuis la ceinture de Kuiper, symétrique conceptuelle de 'inner'.
// LOT 12B — 'sun' retiré de la liste menu : la cible Soleil est atteinte
// uniquement via le bouton ✸ dédié de TimeControls (émet directement
// UI.VIEW_PRESET { preset:'sun' }, défini dans CameraPresets.PRESET_DEFS).
export const VIEW_PRESETS = Object.freeze(['system', 'inner', 'outer']);
