// Bootstrap LOT 1+2 — fondations stables + moteur du temps.
// Profile C : aucune allocation Three.js / objet dans la RAF, dispose explicite au teardown.

import { AmbientLight, Group, PointLight } from 'three';
import { App } from './core/App.js';
import { disposeObject } from './core/disposer.js';
import { loadBodies } from './data/loadBodies.js';
import { createOrbitLine } from './scene/OrbitLine.js';
import { createEclipticReference } from './scene/EclipticReference.js';
import { buildSystem } from './scene/SystemBuilder.js';
import { createSunVideoTexture } from './scene/sunVideoTexture.js';
import { createAsteroidBelt } from './scene/AsteroidBelt.js';
import { createCometSystem } from './scene/CometSystem.js';
import { loadAsteroids } from './data/loadAsteroids.js';
import { getComets } from './data/cometsCatalog.js';
import { TextureCache } from './assets/TextureCache.js';
import { createTimeService } from './time/TimeService.js';
import { bootUI } from './ui/index.js';
import { PlanetStateBuffer } from './scene/PlanetStateBuffer.js';
import { createCameraControls } from './core/CameraControls.js';
import { createBodyMotionUpdater } from './scene/BodyMotionUpdater.js';
import { createCameraFocusController } from './scene/cameraFocus.js';
import { updateAsteroidBelt } from './scene/asteroidBeltUpdater.js';
import { createEarthSeasonMarkers } from './scene/EarthSeasonMarkers.js';
import { createCameraPresets } from './scene/CameraPresets.js';
import { disposeProceduralTextures } from './assets/proceduralTextures.js';
import { satelliteOrbitDisplayScale } from './scene/visualScale.js';
import { createEclipseTracker } from './physics/eclipses.js';
import { createSolarFlareDetector } from './physics/SolarFlareDetector.js';
import { createSolarFlareVisual } from './scene/SolarFlareVisual.js';
import { createSunGlow, disposeSunGlowShared } from './scene/SunGlow.js';
import { createPoleIndicator, disposePoleIndicatorShared } from './scene/PoleIndicator.js';
import { createCometMotionUpdater } from './scene/cometMotionUpdater.js';
import { disposeCometSystem } from './scene/bodyLifecycle.js';
import { applyStarBackground, clearStarBackground } from './scene/StarBackground.js';
import { createSeasonMarkersHover } from './scene/SeasonMarkersHover.js';
import { createSceneClickRouter } from './scene/sceneClickRouter.js';
import { createOrbitLineHover } from './scene/OrbitLineHover.js';
import { createBodyMeshHover } from './scene/bodyMeshHover.js';
import { createAxialTiltAxis } from './scene/AxialTiltAxis.js';
import { ION_TRAIL_COMETS } from './data/cometsCatalog.js';
import { createCometTrail, disposeCometTrailShared } from './scene/CometTrail.js';
import { createOrbitHighlighter } from './scene/OrbitHighlighter.js';
import { densifyAsteroids } from './data/densifyAsteroids.js';
import { MINOR_BODY } from './config/render.config.js';
import * as bus from './ui/core/eventBus.js';
import { ENGINE, UI } from './ui/core/channels.js';

const canvas = document.getElementById('solarCanvas');
if (!canvas) throw new Error('main.js: <canvas id="solarCanvas"> introuvable');

// ---------------------------------------------------------------------------
// UI — bootée AVANT le moteur 3D pour que les composants soient prêts à
// recevoir le premier ENGINE.TIME_CHANGED.
//
// `bootUI()` monte TOUS les composants HUD (TimeControls, TimeStatus, BodyMenu,
// CompareMenu, BodyInfoCard, CompareOverlay, EventStats, SolarFlareAlert) et
// retourne un handle `{ destroy }` qui les démonte tous en une passe.
// Interdiction de re-monter quoi que ce soit ici — sinon doublons à l'écran.
// ---------------------------------------------------------------------------
const ui = await bootUI();

// ---------------------------------------------------------------------------
// Moteur 3D
// ---------------------------------------------------------------------------
const app = new App(canvas);

// Référentiel écliptique (grille + axes) — initialisé une fois.
const reference = createEclipticReference();
app.scene.add(reference);

// Orbites — 2 groupes distincts pour les toggles UI.ORBITS_TOGGLE_*.
// `orbitGroup`       : planètes + Lune + repères saisonniers (rattachés ailleurs).
// `cometOrbitsGroup` : ellipses de comètes uniquement (re-parentage en LOT 5C
//                      depuis `built2.root` après construction).
const orbitGroup = new Group();
orbitGroup.name = 'Orbits';
app.scene.add(orbitGroup);

const cometOrbitsGroup = new Group();
cometOrbitsGroup.name = 'CometOrbits';
app.scene.add(cometOrbitsGroup);

// LOT 6B — Group dédié aux orbites des planètes naines (Pluton, Cérès,
// Hauméa, Makémaké, Éris). Toggle via `UI.ORBITS_TOGGLE_DWARFS`,
// indépendant des orbites planètes (Mercure→Neptune) et minor.
const dwarfOrbitsGroup = new Group();
dwarfOrbitsGroup.name = 'DwarfOrbits';
app.scene.add(dwarfOrbitsGroup);

// LOT 5D — orbites MASQUÉES par défaut (cohérence ARIA : BodyMenu démarre
// avec `aria-checked="false"`). ENGINE.SCENE_RESET NE doit PAS réinitialiser
// ces visibilités (préférence utilisateur conservée à travers les resets).
orbitGroup.visible = false;
cometOrbitsGroup.visible = false;
dwarfOrbitsGroup.visible = false;

// Cache d'assets partagé — un seul GPU upload par texture, dispose centralisé.
const textureCache = new TextureCache();
const buffer = new PlanetStateBuffer();

// OrbitControls : créés AVANT le try{} pour rester disponibles même si le
// chargement des données échoue (la scène vide reste navigable).
const camCtl = createCameraControls(app.camera, canvas);

// TimeService : instancié AVANT le try{} pour éviter le TDZ ReferenceError
// quand BodyMotionUpdater le capture (fix Profile C, validation LOT 4).
const timeService = createTimeService();
timeService.start(0);
let systemRoot = null;
let sunVideo = null;       // LOT 12B — handle { texture, video, dispose } | null
let asteroidBelt = null;
let cometRoot = null;
let motionUpdater = null;
let focusController = null;
let seasonMarkers = null;
let presetsController = null;
let flareVisual = null;
let sunGlow = null;
let earthPoleIndicator = null;
let flareDetector = null;
let eclipseTracker = null;
let cometMotion = null;
let focusableAstSystem = null;
let markersHover = null;
let clickRouter = null;
let orbitHover = null;
let bodyMeshHover = null;
let orbitHighlighter = null;
let earthAxialTiltAxis = null;
const cometTrails = [];          // { trail, group } — pour tick + dispose
let moonOrbitLine = null;        // référence ciblée pour le toggle "Orbites planètes"

try {
  const data = await loadBodies();

  // Corps célestes + anneaux + Lune (LOT 3) ---------------------------------
  // Construit AVANT les orbites pour que les orbites satellites puissent être
  // rattachées au parent (sinon la Lune dessine une orbite minuscule au Soleil).
  // LOT 12B — tentative de chargement vidéo Soleil. Garde-fous internes
  // (reduced-motion, slow connection, autoplay refusé) → null = fallback statique.
  sunVideo = await createSunVideoTexture();
  const built = await buildSystem(data, textureCache, { sunVideoTexture: sunVideo?.texture ?? null });
  systemRoot = built.root;
  app.scene.add(systemRoot);

  // Orbites (LOT 1) ---------------------------------------------------------
  // LOT 5 : pour un satellite, on scale visuellement l'orbite par le même
  // facteur que celui appliqué par BodyMotionUpdater à la position du corps
  // (`satelliteOrbitDisplayScale`). Sans cela, la ligne d'orbite reste à
  // l'échelle réelle (intérieure au mesh parent) et la Lune apparaît
  // "déconnectée" de sa propre trajectoire dessinée.
  for (const body of Object.values(data.bodies)) {
    if (!body.orbital) continue;
    // LOT 7 — palette par famille (ORBIT_COLORS).
    let family;
    if (body.parent) family = 'satellite';
    else if (body.type === 'dwarf_planet') family = 'dwarf';
    else family = 'planet';
    const line = createOrbitLine(body.orbital, { family });
    line.name = `orbit:${body.id}`;
    // LOT 8B — id explicite pour OrbitLineHover (résolution directe sans parser le name).
    line.userData.bodyId = body.id;
    // LOT 8D — semi-grand axe pour threshold adaptatif du raycaster Line.
    line.userData.semiMajorAxisAu = body.orbital.semiMajorAxisAu;
    const parentNode = body.parent ? built.bodies.get(body.parent) : null;
    if (parentNode) {
      const parentVisual = parentNode.userData?.visualRadius ?? 0;
      const childVisual = built.bodies.get(body.id)?.userData?.visualRadius ?? 0;
      const s = satelliteOrbitDisplayScale(
        parentVisual, childVisual, body.orbital.semiMajorAxisAu,
      );
      if (s !== 1) line.scale.setScalar(s);
    }
    // LOT 6B — routage par catégorie : satellites → parent ; planètes naines
    // → dwarfOrbitsGroup ; planètes → orbitGroup.
    let host;
    if (parentNode) host = parentNode;
    else if (body.type === 'dwarf_planet') host = dwarfOrbitsGroup;
    else host = orbitGroup;
    host.add(line);
    // LOT 6 — capture la référence de l'orbite lunaire pour le toggle global.
    // LOT 7 — orbite Lune désactivée par défaut (cohérence avec la masquage
    // contextuel "Lune" dans BodyMenu : visible uniquement sur survol Terre).
    if (body.id === 'moon') {
      moonOrbitLine = line;
      moonOrbitLine.visible = false;
    }
  }

  // Éclairage solaire — PointLight au centre + ambient très faible pour que
  // la nuit ne soit pas absolument noire (lecture du night map garantie).
  // LOT 7B : intensity = 18 + decay = 2 (profil 1/r² physiquement réaliste).
  // Cible : Pluton à 30 UA reçoit ≤ 0.05× ce que reçoit la Terre (1/30² ≈
  // 0.0011 si la Terre est à 1). Non-noirceur intérieure garantie par
  // AmbientLight(0xffffff, 0.02) déjà présent + albédos PBR.
  const sunLight = new PointLight(0xffffff, 12, 0, 1.3);
  sunLight.name = 'SunLight';
  built.bodies.get('sun')?.add(sunLight);
  app.scene.add(new AmbientLight(0xffffff, 0.02));

  // LOT 7B — halo visuel permanent autour du Soleil (découplé de la lumière).
  sunGlow = createSunGlow({ sunNode: built.bodies.get('sun') });

  // LOT 7C — indicateur N/S sur la Terre, visible au survol uniquement.
  const earthNode = built.bodies.get('earth');
  if (earthNode) {
    earthPoleIndicator = createPoleIndicator({ bodyNode: earthNode, bodyId: 'earth' });
  }

  // Corps mineurs (LOT 4) ---------------------------------------------------
  // Astéroïdes : InstancedMesh (1 draw call). Échec réseau non bloquant.
  //
  // LOT 5D — split : les 3 plus gros astéroïdes (Cérès, Vesta, Pallas) sont
  // EXTRAITS du belt et instanciés via createCometSystem pour devenir
  // focusables individuellement (l'InstancedMesh ne l'est pas par instance).
  // LOT 10 — Cérès retirée : désormais planète naine (bodies.json), routée
  // via SystemBuilder vers `dwarfOrbitsGroup`. Vesta et Pallas restent des
  // astéroïdes focusables (section "Comètes & Astéroïdes" du BodyMenu).
  const FOCUSABLE_AST_IDS = ['vesta', 'pallas'];
  try {
    const asteroids = await loadAsteroids();
    const focusableAst = asteroids.filter((a) => FOCUSABLE_AST_IDS.includes(a.id));
    const beltSeed     = asteroids.filter((a) => !FOCUSABLE_AST_IDS.includes(a.id));
    // LOT 6 — densification ×100 (~15 000 instances). Activé grâce à
    // `evaluateOrbitalElementsInto` (Session B) consommé par
    // `asteroidBeltUpdater` : 0 alloc/astéroïde/frame.
    const beltAst = densifyAsteroids(beltSeed, 100);
    asteroidBelt = createAsteroidBelt(beltAst);
    if (asteroidBelt) app.scene.add(asteroidBelt);
    if (focusableAst.length > 0) {
      // Réutilise createCometSystem (Group/corps + orbit), pattern uniforme.
      // LOT 9 — variant 'asteroid' : matériau routé vers la texture procédurale
      // sombre [0x2a..0x6b] (cohérent avec le belt), au lieu du noise clair comète.
      focusableAstSystem = createCometSystem(focusableAst, { variant: 'asteroid' });
      focusableAstSystem.root.name = 'FocusableAsteroids';
      app.scene.add(focusableAstSystem.root);
      // Leurs orbites suivent le toggle "minor" — même sémantique UI.
      for (const entry of focusableAstSystem.comets.values()) {
        if (entry.orbit) cometOrbitsGroup.add(entry.orbit);
      }
    }
  } catch (err) {
    console.warn('[main] astéroïdes indisponibles', err);
  }

  // Comètes : catalogue dur, orbites e > 0.84 (Halley, Hale-Bopp, Encke…).
  const built2 = createCometSystem(getComets());
  cometRoot = built2.root;
  app.scene.add(cometRoot);

  // LOT 5C — re-parentage des orbites comètes vers `cometOrbitsGroup` pour
  // pouvoir les toggler indépendamment des orbites planétaires.
  for (const entry of built2.comets.values()) {
    if (entry.orbit) cometOrbitsGroup.add(entry.orbit); // .add() détache du parent précédent
  }

  // LOT 6B (révision) — trail UNIQUE par comète : poussière orbitale.
  // La queue plasma (anti-solaire radiale) a été retirée sur retour utilisateur.
  // Les Points vivent dans la scène racine (héliocentrique) pour ne pas suivre
  // rigidement le nucléus.
  // LOT 8 — flag `ionTrail` actif pour Hale-Bopp et Neowise (2 queues).
  for (const [id, entry] of built2.comets) {
    const ionTrail = ION_TRAIL_COMETS.has(id);
    const trail = createCometTrail({ ionTrail });
    app.scene.add(trail.dust);
    if (trail.ion) app.scene.add(trail.ion);
    cometTrails.push({ trail, group: entry.root });
  }

  // LOT 9 — surbrillance d'orbite sur survol BodyMenu (canal UI.ORBIT_HIGHLIGHT).
  // Construit l'index ICI parce que les orbites comètes viennent d'être
  // re-parentées vers `cometOrbitsGroup` à la ligne précédente.
  orbitHighlighter = createOrbitHighlighter({
    bus, groups: [orbitGroup, dwarfOrbitsGroup, cometOrbitsGroup],
  });

  // Repères équinoxes/solstices (LOT 5) — consomme earthMarkers de Session B.
  // LOT 6 : ajoutés dans `orbitGroup` pour suivre le toggle "Orbites planètes"
  // (visibilité Three.js propagée automatiquement aux enfants, contrat C #6).
  const earthBody = data.bodies.earth;
  if (earthBody?.orbital) {
    seasonMarkers = createEarthSeasonMarkers(earthBody.orbital);
    orbitGroup.add(seasonMarkers);

    // LOT 6 — raycaster mousemove sur les 4 marqueurs.
    markersHover = createSeasonMarkersHover({
      canvas, camera: app.camera, markersGroup: seasonMarkers,
    });
  }

  // -------------------------------------------------------------------------
  // LOT 7 — Soleil cliquable n'importe quand.
  // sceneClickRouter émet UI.VIEW_FOCUS + UI.BODY_SELECT au pointerdown.
  // Extensible : ajouter d'autres clickables par `addClickable(node, id)`.
  // -------------------------------------------------------------------------
  clickRouter = createSceneClickRouter({ canvas, camera: app.camera });
  // LOT 10 — Soleil retiré du routage clic-scène : seul le bouton ☀ du
  // toolbar (LOT 9) doit focuser le Soleil. Clic sur le disque solaire dans
  // la scène = no-op (séparation interaction scène libre vs action UI).

  // -------------------------------------------------------------------------
  // LOT 7 — Anchors invisibles le long des orbites pour hover précis.
  // Toutes les orbites (planètes + dwarfs + comètes + top-3 ast + Lune) sont
  // échantillonnées à 16 points → ~22 × 16 ≈ 350 sphères de rayon 0.001 UA,
  // géométrie + matériau partagés. Vivent dans la scène racine (héliocentrique
  // pour planètes/dwarfs, locale Terre pour la Lune — gérée séparément si besoin).
  // -------------------------------------------------------------------------
  const anchorBodies = [];
  for (const b of Object.values(data.bodies)) {
    if (b.orbital && !b.parent) anchorBodies.push({ id: b.id, orbital: b.orbital });
  }
  // LOT 8D — hover orbite avec garde explicite par toggle + threshold adaptatif.
  // Le hover NE déclenche QUE si le toggle correspondant a été activé par
  // l'utilisateur (3 booléens scope handler synchronisés sur `UI.ORBITS_TOGGLE_*`).
  orbitHover = createOrbitLineHover({
    canvas, camera: app.camera,
    planetRoot: orbitGroup,
    dwarfRoot:  dwarfOrbitsGroup,
    minorRoot:  cometOrbitsGroup,
  });

  // LOT 8 — raycaster mesh ⇒ canal `UI.BODY_MESH_HOVER` distinct de VIEW_HOVER.
  bodyMeshHover = createBodyMeshHover({
    canvas, camera: app.camera, bodies: built.bodies,
  });

  // LOT 8 — axe d'inclinaison + indicateurs N/S visibles au survol mesh Terre.
  if (earthNode) {
    earthAxialTiltAxis = createAxialTiltAxis({ bodyNode: earthNode, bodyId: 'earth' });
  }

  // -------------------------------------------------------------------------
  // Propagation Kepler : positions des corps mises à jour chaque frame.
  // Doit être enregistré AVANT cameraFocus (focus suit la position courante).
  // -------------------------------------------------------------------------
  motionUpdater = createBodyMotionUpdater({
    data, bodies: built.bodies, buffer, timeService,
  });
  app.registerUpdater(motionUpdater);

  // -------------------------------------------------------------------------
  // Caméra : OrbitControls + handler UI.VIEW_FOCUS/RESET.
  // L'updater de damping (controls.update) doit tourner APRÈS le focus pour
  // intégrer la nouvelle target dans le même frame.
  // -------------------------------------------------------------------------
  // LOT 5C/5D — Map unifiée planètes + comètes + top-3 astéroïdes pour cameraFocus.
  // Les Groups reçoivent ici les userData.{id, visualRadius} attendus
  // par cameraFocus (FOCUS.DISTANCE_MULTIPLIER × visualRadius).
  const focusableBodies = new Map(built.bodies);
  for (const [id, entry] of built2.comets) {
    if (!entry.root) continue;
    entry.root.userData = entry.root.userData || {};
    entry.root.userData.id = id;
    entry.root.userData.visualRadius = MINOR_BODY.COMET_VISUAL_RADIUS_AU;
    focusableBodies.set(id, entry.root);
  }
  if (focusableAstSystem) {
    for (const [id, entry] of focusableAstSystem.comets) {
      if (!entry.root) continue;
      entry.root.userData = entry.root.userData || {};
      entry.root.userData.id = id;
      // Astéroïdes individuels affichés un peu plus gros que la moyenne du belt
      // pour rester focusables sans charger trop le rendu.
      entry.root.userData.visualRadius = MINOR_BODY.ASTEROID_VISUAL_RADIUS_AU * 2;
      focusableBodies.set(id, entry.root);
    }
  }

  focusController = createCameraFocusController({
    camera: app.camera, controls: camCtl.controls, bodies: focusableBodies,
  });
  app.registerUpdater((dt) => focusController.tick(dt));

  // Presets PoV (LOT 5) — consomme UI.VIEW_PRESET, partage controls/camera/focus.
  presetsController = createCameraPresets({
    camera: app.camera, controls: camCtl.controls, data, focus: focusController,
  });
  app.registerUpdater((dt) => presetsController.tick(dt));
  // LOT 8B — exposition debug pour `window.__presets.applyPreset('inner')`.
  if (typeof window !== 'undefined') window.__presets = presetsController;

  app.registerUpdater(() => camCtl.update());

  // -------------------------------------------------------------------------
  // Astéroïdes : propagation in-place via le updater Profile C.
  // -------------------------------------------------------------------------
  if (asteroidBelt) {
    app.registerUpdater(() => {
      const snap = timeService.clock.getSnapshot();
      updateAsteroidBelt(asteroidBelt, snap.deltaHours / 24);
    });
  }

  // -------------------------------------------------------------------------
  // LOT 5D — Propagation Kepler des comètes ET des top-3 astéroïdes promus.
  // Cause racine : BodyMotionUpdater itère `data.bodies` (planètes seules) et
  // n'a jamais touché aux comètes — leur Group restait figé à (0,0,0).
  // Union des Maps construite à l'init UNIQUEMENT (zéro alloc en RAF).
  // -------------------------------------------------------------------------
  const cometMotionMap = new Map(built2.comets);
  if (focusableAstSystem) {
    for (const [id, entry] of focusableAstSystem.comets) {
      cometMotionMap.set(id, entry);
    }
  }
  cometMotion = createCometMotionUpdater({ comets: cometMotionMap, timeService });
  app.registerUpdater(() => cometMotion.tick());

  // LOT 6 — tick des trails après propagation des comètes (ordre garantit
  // que la position MONDE est à jour quand on l'écrit dans le ring buffer).
  // Scratch Vector3 module-scope ré-utilisé dans CometTrail (pool interne).
  app.registerUpdater(() => {
    // LOT 7C — émission cadencée par TEMPS SIMULÉ ⇒ longueur de queue identique
    // à 1×/64×/1024×. On lit `deltaHours` du snapshot pour le passer à chaque tick.
    const snap = timeService.clock.getSnapshot();
    const dHours = snap.deltaHours;
    for (let i = 0; i < cometTrails.length; i++) {
      const t = cometTrails[i];
      // `entry.root.position` est héliocentrique (nuclei enfants directs de la
      // scène racine via cometRoot), utilisable tel quel.
      // LOT 8 — émission par FRAME, indépendante de timeSpeed.
      t.trail.tick(t.group.position);
    }
  });

  // -------------------------------------------------------------------------
  // Moteur d'éclipses (LOT 5) — propagation analytique indépendante,
  // sub-stepping interne (Session B), debounce par état précédent.
  //
  // Mapping des types tracker → canaux UI :
  //   'solar'      → 'solarEclipse'
  //   'lunar'      → 'lunarEclipse'
  //   'superMoon'  → 'superMoon'
  //
  // Zéro-alloc : l'objet `eventPayload` est mutualisé, mute à chaque émission.
  // -------------------------------------------------------------------------
  const earthEl = data.bodies.earth?.orbital;
  const moonEl = data.bodies.moon?.orbital;
  const sunR = data.bodies.sun?.physical?.radiusAu;
  const earthR = data.bodies.earth?.physical?.radiusAu;
  const moonR = data.bodies.moon?.physical?.radiusAu;
  if (earthEl && moonEl && sunR && earthR && moonR) {
    eclipseTracker = createEclipseTracker({
      earthElements: earthEl,
      moonElements:  moonEl,
      sunRadiusAu:   sunR,
      earthRadiusAu: earthR,
      moonRadiusAu:  moonR,
    });
    const tracker = eclipseTracker;

    // Payload réutilisé — les champs sont primitifs, on mute en place.
    const eventPayload = { type: 'solarEclipse', at: 0, kind: null };
    const TYPE_MAP = { solar: 'solarEclipse', lunar: 'lunarEclipse', superMoon: 'superMoon' };

    app.registerUpdater(() => {
      const snap = timeService.clock.getSnapshot();
      if (snap.deltaHours === 0) return;
      tracker.advance(snap.deltaHours, (ev) => {
        eventPayload.type = TYPE_MAP[ev.type] ?? ev.type;
        eventPayload.at = snap.elapsedHours;
        eventPayload.kind = ev.kind ?? null;
        bus.emit(ENGINE.EVENT_DETECTED, eventPayload);
      });
    });

    // Exposition debug — Session D / C peuvent inspecter les compteurs.
    if (typeof window !== 'undefined') window.__eclipseTracker = tracker;
  } else {
    console.warn('[main] EclipseTracker non instancié — données Earth/Moon/Sun incomplètes');
  }

  // -------------------------------------------------------------------------
  // Visuel 3D Éruption solaire (LOT 5C) — Sprite halo sur le Soleil.
  // Abonné à ENGINE.SOLAR_FLARE_START/END (Session B émettra le cycle de 11 ans).
  // -------------------------------------------------------------------------
  flareVisual = createSolarFlareVisual({ sunNode: built.bodies.get('sun') });
  app.registerUpdater((dt) => flareVisual.tick(dt));

  // -------------------------------------------------------------------------
  // Détecteur d'éruption solaire (LOT 5C) — cycle de Schwabe 11 ans.
  // Pattern zero-alloc identique à EclipseTracker (payloads de module mutés).
  // Sans ce câblage, `SolarFlareVisual` ne reçoit jamais ENGINE.SOLAR_FLARE_*
  // et `EventStats.solarFlare` reste à 0 ad vitam (cause racine LOT 5C bug 6).
  // -------------------------------------------------------------------------
  flareDetector = createSolarFlareDetector({ timeService });
  app.registerUpdater(() => flareDetector.tick());
  if (typeof window !== 'undefined') window.__flareDetector = flareDetector;

  // -------------------------------------------------------------------------
  // LOT 6 — fond stellaire equirectangulaire (Voie Lactée).
  // Échec non bloquant : la scène garde son fond noir si l'asset manque.
  // -------------------------------------------------------------------------
  await applyStarBackground(app.scene, textureCache, app.renderer);
} catch (err) {
  console.error('[main] échec construction système', err);
}

// ---------------------------------------------------------------------------
// Moteur du temps — tick branché en updater RAF.
// Le `tick` consomme `elapsedSeconds` fourni par App ; le snapshot émis par
// TimeService est un objet mutable réutilisé (zéro allocation par frame).
// ---------------------------------------------------------------------------
app.registerUpdater((_dt, elapsedSeconds) => {
  timeService.tick(elapsedSeconds);
});

// ---------------------------------------------------------------------------
// LOT 5C — abonnements canaux au scope module.
//   - UI.ORBITS_TOGGLE_PLANETS : toggle visibility du Group `orbitGroup`.
//   - UI.ORBITS_TOGGLE_MINOR   : toggle visibility de `cometOrbitsGroup`.
//   - ENGINE.SCENE_RESET       : émis par TimeService sur UI.TIME_RESET.
//     Relais vers tous les modules qui propagent un état orbital ou un
//     compteur d'événements.
// ---------------------------------------------------------------------------
const unsubTogP = bus.on(UI.ORBITS_TOGGLE_PLANETS, (p) => {
  const v = !!p?.visible;
  orbitGroup.visible = v;
  // LOT 16 #12 — l'orbite Lune est passée sous le canal SATELLITES dédié.
});
const unsubTogS = bus.on(UI.ORBITS_TOGGLE_SATELLITES, (p) => {
  if (moonOrbitLine) moonOrbitLine.visible = !!p?.visible;
});
const unsubTogM = bus.on(UI.ORBITS_TOGGLE_MINOR, (p) => {
  cometOrbitsGroup.visible = !!p?.visible;
});
const unsubTogD = bus.on(UI.ORBITS_TOGGLE_DWARFS, (p) => {
  dwarfOrbitsGroup.visible = !!p?.visible;
});
const unsubReset = bus.on(ENGINE.SCENE_RESET, () => {
  motionUpdater?.resetToEpoch?.();
  asteroidBelt?.userData?.reset?.();
  cometMotion?.reset?.();
  eclipseTracker?.resetCounters?.();
  flareDetector?.reset?.();
  // NB LOT 5D : orbitGroup.visible / cometOrbitsGroup.visible NE sont PAS
  // réinitialisés ici — préférence utilisateur conservée à travers les resets.
});

app.start();

// LOT 12 — Boot sur preset `system` : avec l'échelle 1:1 stricte, la position
// caméra par défaut (CAMERA.initialPosition) montre une scène quasi-vide.
// `applyPreset('system')` cadre les orbites internes au démarrage.
presetsController?.applyPreset?.('system');

// ---------------------------------------------------------------------------
// Teardown — libère GPU + listeners + abonnements bus.
// ---------------------------------------------------------------------------
const teardown = () => {
  timeService.destroy();
  ui?.destroy?.();
  disposeObject(reference);
  disposeObject(orbitGroup);
  unsubTogP();
  unsubTogS();
  unsubTogM();
  unsubTogD();
  unsubReset();
  markersHover?.destroy();
  clickRouter?.destroy();
  orbitHover?.destroy();
  bodyMeshHover?.destroy();
  orbitHighlighter?.destroy();
  earthAxialTiltAxis?.destroy();
  // LOT 6 — libérer chaque trail puis la texture partagée + fond stellaire.
  for (let i = 0; i < cometTrails.length; i++) {
    const t = cometTrails[i];
    if (t.trail?.dust) app.scene.remove(t.trail.dust);
    if (t.trail?.ion)  app.scene.remove(t.trail.ion);
    t.trail?.dispose?.();
  }
  cometTrails.length = 0;
  disposeCometTrailShared();
  clearStarBackground(app.scene);
  flareVisual?.destroy();
  sunGlow?.destroy();
  disposeSunGlowShared();
  earthPoleIndicator?.destroy();
  disposePoleIndicatorShared();
  focusController?.destroy();
  presetsController?.destroy();
  camCtl.dispose();
  // seasonMarkers est désormais enfant d'`orbitGroup` → libéré par disposeObject(orbitGroup).
  if (systemRoot) disposeObject(systemRoot);
  if (asteroidBelt) disposeObject(asteroidBelt);
  if (cometRoot) disposeCometSystem(cometRoot);
  if (focusableAstSystem?.root) disposeCometSystem(focusableAstSystem.root);
  disposeObject(cometOrbitsGroup);
  disposeObject(dwarfOrbitsGroup);
  textureCache.disposeAll();
  disposeProceduralTextures();
  sunVideo?.dispose?.();   // LOT 12B — release <video> + VideoTexture
  app.renderer.userData?.detach?.();
  app.dispose();
};
window.addEventListener('pagehide', teardown, { once: true });

if (typeof window !== 'undefined') {
  window.__solarApp = app;
  window.__solarTime = timeService;
}
