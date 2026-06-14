// Données des planètes : nom, taille, distance du soleil, vitesse orbitale, texture
export const planets = [
  { name: "Mercure", size: 0.38, speed: 0.02, texture: "textures/mercury.jpg", camDistanceButton: -1.52,
    orbitColor: "#ffffff", aphelie: 5514.66, periphelie: 3637.33, obliquity : 0.03 },

  { name: "Vénus", size: 0.95, speed: 0.015, texture: "textures/venus.jpg", camDistanceButton: -3.80,
    orbitColor: "#ffffff", aphelie: 8544.68, periphelie: 8429.58, obliquity : 177.36 },

  { name: "Terre", size: 1, speed: 0.01, texture: "textures/earth.jpg", camDistanceButton: -4, 
    orbitColor: "#503bf4",  aphelie: 11929.38, periphelie: 11537.26, obliquity : 23.44 },

  { name: "Mars", size: 0.53, speed: 0.008, texture: "textures/mars.jpg", camDistanceButton: -2.12,
    orbitColor: "#ffffff", aphelie: 19547.96, periphelie: 16208.42, obliquity : 25.19 },

  { name: "Jupiter", size: 11, speed: 0.004, texture: "textures/jupiter.jpg", camDistanceButton: -44,
    orbitColor: "#ffffff", aphelie: 64000.62, periphelie: 58092.89, obliquity : 3.12},

  { name: "Saturne", size: 9.5, speed: 0.003, texture: "textures/saturn.jpg", camDistanceButton: -38,
    orbitColor: "#ffffff", aphelie: 117949.97, periphelie: 105869.84, obliquity : 26.73 },

  { name: "Uranus", size: 4, speed: 0.002, texture: "textures/uranus.jpg", camDistanceButton: -16,
    orbitColor: "#ffffff", aphelie: 235793.00, periphelie: 214512.26, obliquity : 97.8 },

  { name: "Neptune", size: 3.88, speed: 0.001, texture: "textures/neptune.jpg", camDistanceButton: -15.52,
    orbitColor: "#ffffff", aphelie: 355848.43, periphelie: 349789.34, obliquity : 29.58 },

  { name: "Sun", size: 110, speed: 0.045, texture: "textures/sun.jpg", camDistanceButton: 440,
    aphelie: 0, periphelie: 0, obliquity : 0 },

];
console.log("planets.js chargé");

// Fonction pour charger une texture à partir d'un chemin donné (grâce à THREE)
export function loadTexture(path) {
  const loader = new THREE.TextureLoader();
  return loader.load(path);
  
}

const sunVideo = document.createElement("video");
sunVideo.src = "textures/sun.mp4"; // Remplace par un fichier vidéo valide
sunVideo.loop = true;
sunVideo.muted = true;
sunVideo.play();
sunVideo.playbackRate = 0.5; // Ralentit la vidéo (1 = normal, <1 = plus lent)

const sunTexture = new THREE.VideoTexture(sunVideo);
sunTexture.minFilter = THREE.LinearFilter;
sunTexture.magFilter = THREE.LinearFilter;
sunTexture.format = THREE.RGBFormat;
console.log("functions.js chargé");




// Groupe contenant tous les jets actifs
const eruptionParticles = new THREE.Group();

// Chargement de la texture des particules
const particleTexture = new THREE.TextureLoader().load("textures/lava_frame.jpg");

// Paramètres du Soleil et des jets
const SUN_RADIUS = 100; // Rayon du Soleil
const START_HEIGHT = SUN_RADIUS; // Les jets commencent à la surface
const JET_HEIGHT = 20; // Hauteur totale atteinte par le jet
const CURVE_INTENSITY = 50; // Force de la courbure

/**
 * Génère un point aléatoire sur la surface du Soleil (rayon fixe)
 */
function getRandomSurfacePoint() {
  const theta = Math.random() * Math.PI * 2; // Angle horizontal (0 à 360°)
  const phi = Math.acos(2 * Math.random() - 1); // Angle vertical (-90° à +90°)

  return new THREE.Vector3(
    SUN_RADIUS * Math.sin(phi) * Math.cos(theta),
    SUN_RADIUS * Math.sin(phi) * Math.sin(theta),
    SUN_RADIUS * Math.cos(phi)
  );
}

/**
 * Crée un jet courbé qui commence à 110 et atteint 150 avant de disparaître
 */
function createCurvedPlasmaJet() {
  const numParticles = 200;
  const cloudDensity = 300;
  const dispersion = 25;

  // Point de départ du jet sur la surface du Soleil
  const startPos = getRandomSurfacePoint();

  // Direction initiale perpendiculaire à la surface
  const direction = startPos.clone().normalize();

  // Déterminer un axe perpendiculaire pour la courbure
  const perpendicularAxis = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

  // Points définissant la courbure du jet (200°)
  const points = [
    startPos.clone(),
    startPos.clone().add(direction.clone().multiplyScalar(JET_HEIGHT * 0.25)), // Début du jet droit
    startPos.clone().add(direction.clone().multiplyScalar(JET_HEIGHT * 0.5)), // Montée progressive
    startPos.clone().add(direction.clone().multiplyScalar(JET_HEIGHT * 0.6))
      .add(perpendicularAxis.clone().multiplyScalar(CURVE_INTENSITY * 0.5)), // Début courbure
    startPos.clone().add(direction.clone().multiplyScalar(JET_HEIGHT * 0.8))
      .add(perpendicularAxis.clone().multiplyScalar(CURVE_INTENSITY)), // Milieu courbure
    startPos.clone().add(direction.clone().multiplyScalar(JET_HEIGHT))
      .add(perpendicularAxis.clone().multiplyScalar(CURVE_INTENSITY * 1.5)) // Fin courbure
  ];

  // Création de la courbe
  const curve = new THREE.CatmullRomCurve3(points, false);

  // Groupe contenant le jet et le nuage
  const jet = new THREE.Group();

  // Création du nuage de particules au niveau de la base du jet
  for (let i = 0; i < cloudDensity; i++) {
    const particleMaterial = new THREE.SpriteMaterial({
      map: particleTexture,
      transparent: true,
      opacity: Math.random() * 0.6 + 0.2,
      blending: THREE.AdditiveBlending
    });

    const cloudParticle = new THREE.Sprite(particleMaterial);
    cloudParticle.scale.set(3, 3, 3);

    // Position initiale autour de la base du jet avec une dispersion légère
    cloudParticle.position.copy(startPos).add(new THREE.Vector3(
      (Math.random() - 0.5) * dispersion,
      (Math.random() - 0.5) * dispersion,
      (Math.random() - 0.5) * dispersion
    ));

    jet.add(cloudParticle);

    // Animation du nuage
    new TWEEN.Tween(cloudParticle.position)
      .to({
        x: cloudParticle.position.x + (Math.random() - 0.5) * 5,
        y: cloudParticle.position.y + Math.random() * 5,
        z: cloudParticle.position.z + (Math.random() - 0.5) * 5
      }, 3000)
      .repeat(Infinity)
      .yoyo(true)
      .start();
  }

  // Création du jet de plasma
  for (let i = 0; i < numParticles; i++) {
    const particleMaterial = new THREE.SpriteMaterial({
      map: particleTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    const particle = new THREE.Sprite(particleMaterial);
    particle.scale.set(3, 3, 3);

    const t = i / numParticles;
    const positionOnCurve = curve.getPoint(t);

    // Légère dispersion pour un effet naturel
    particle.position.set(
      positionOnCurve.x + (Math.random() - 0.5) * 3,
      positionOnCurve.y + (Math.random() - 0.5) * 3,
      positionOnCurve.z + (Math.random() - 0.5) * 3
    );

    jet.add(particle);

    // Apparition progressive
    new TWEEN.Tween(particle.material)
      .to({ opacity: Math.random() * 0.8 + 0.2 }, 1000)
      .delay(i * 5)
      .start();

    // Animation de montée
    new TWEEN.Tween(particle.position)
      .to(curve.getPoint(Math.min(t + 0.4, 1)), 3000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();

    // Disparition
    new TWEEN.Tween(particle.material)
      .to({ opacity: 0 }, 3500)
      .delay(2000)
      .onComplete(() => jet.remove(particle))
      .start();
  }

  // Ajout du jet à la scène
  eruptionParticles.add(jet);

  // Suppression après 5 secondes
  setTimeout(() => eruptionParticles.remove(jet), 5000);
}

/**
 * Fonction qui déclenche plusieurs jets simultanément à des endroits aléatoires sur la sphère
 */
function eruptCurvedJetsRandomly() {
  const jetsCount = Math.floor(Math.random() * 3) + 2; // Entre 2 et 4 jets en même temps

  for (let i = 0; i < jetsCount; i++) {
    createCurvedPlasmaJet();
  }

  setTimeout(eruptCurvedJetsRandomly, Math.random() * 2000 + 1000); // Relance avec un intervalle aléatoire
}

// Démarrage du processus
eruptCurvedJetsRandomly();





const scene = new THREE.Scene(); 
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 1000000); //champ de vision de en degrés/ un rapport d'aspect basé sur la taille de la fenêtre/ et des plans de coupe proche et lointain
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Adapter la scène à la taille de l'écran
function resizeScene() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// Écoute l'événement de redimensionnement
window.addEventListener("resize", resizeScene);






// Lumière solaire (pour planets)
const light = new THREE.PointLight(0xffffff, 0.3, 10000000);
const light2 = new THREE.PointLight(0xffffff, 0.3, 10000000);
const light3 = new THREE.PointLight(0xffffff, 0.3, 10000000);
const light4 = new THREE.PointLight(0xffffff, 0.3, 10000000);
light.position.set(111, 0, 0);
light2.position.set(-111, 0, 0);
light3.position.set(0, 0, 111);
light4.position.set(0, 0, -111);
scene.add(light);
scene.add(light2);
scene.add(light3);
scene.add(light4);

// Lumière solaire (pour soleil)
const lightS = new THREE.PointLight(0xffffff, 2, 1000);
const light2S = new THREE.PointLight(0xffffff, 2, 1000);
const light3S = new THREE.PointLight(0xffffff, 2, 1000);
const light4S = new THREE.PointLight(0xffffff, 2, 1000);
const light5S = new THREE.PointLight(0xffffff, 2, 1000);
const light6S = new THREE.PointLight(0xffffff, 2, 1000);
lightS.position.set(300, 0, 0);
light2S.position.set(-300, 0, 0);
light3S.position.set(0, 300, 0);
light4S.position.set(0, -300, 0);
light5S.position.set(0, 0, 300);
light6S.position.set(0, 0, -300);
scene.add(lightS);
scene.add(light2S);
scene.add(light3S);
scene.add(light4S);
scene.add(light5S);
scene.add(light6S);




function addSunGlow(sunMesh, camera) {
  const glowTexture = new THREE.TextureLoader().load('textures/sun_glow.png');
  const glowMaterial = new THREE.SpriteMaterial({ 
      map: glowTexture, 
      transparent: true,  //S'assure de prendre que l'image
      opacity: 0.6 //Opacité de l'image
  });

  const glow = new THREE.Sprite(glowMaterial); //Création du sprite
  glow.position.set(sunMesh.position.x +20, sunMesh.position.y - 50, sunMesh.position.z );
  sunMesh.add(glow);

  function updateGlowSize() {
      const distance = camera.position.distanceTo(sunMesh.position); //clacule la distance avec la caméra
      const scaleFactor = 100 + Math.sqrt(distance) * 100; // Ajustement en fonction de la distance
      glow.scale.set(scaleFactor, scaleFactor, 1); //Applqiue à l'echelle
  }

  function animateGlow() {
      requestAnimationFrame(animateGlow); //Boucle d'animation qui s'exécute en continu
      updateGlowSize(); //Met à jour la taille du glow à chaque image
  }
  animateGlow();
}

const sunMesh = new THREE.Mesh( //Ajout d'une entité Soleil afin de lui greffer le rayon
);
scene.add(sunMesh);
addSunGlow(sunMesh, camera);









// const spaceTexture = new THREE.TextureLoader().load("textures/stars_welcome__contactyway.jpg");
const spaceTexture = new THREE.TextureLoader().load("textures/stars.jpg");
spaceTexture.wrapS = THREE.RepeatWrapping; //Active un mode répétitif de texture 
spaceTexture.wrapT = THREE.RepeatWrapping;
scene.background = spaceTexture;


// Ajout des planètes
const planetTable = [];
planets.forEach((planet) => {
    const geometry = new THREE.SphereGeometry(planet.size, 128, 128);
    const texture = loadTexture(planet.texture);
    
    if (!texture) console.warn(`⚠️ Aucune texture trouvée pour ${planet.name}`);
    
    const material = new THREE.MeshStandardMaterial({ map: texture || null });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = THREE.MathUtils.degToRad(planet.obliquity || 0);
    mesh.name = planet.name;

    // Placement initial au périhélie (point le plus proche du Soleil)
    const semiMajorAxis = (planet.aphelie + planet.periphelie) / 2;
    const semiMinorAxis = Math.sqrt(planet.aphelie * planet.periphelie);
    const focalDistance = semiMajorAxis - planet.periphelie;

    mesh.position.x = Math.cos(0) * semiMajorAxis - focalDistance;
    mesh.position.z = Math.sin(0) * semiMinorAxis;
    mesh.position.y = 0;

    console.log(`✅ Position initiale ${planet.name} → X: ${mesh.position.x}, Z: ${mesh.position.z}`);

    // Ajout des anneaux de Saturne
    if (planet.name === "Saturne") {
        const ringGeometry = new THREE.RingGeometry(17.1, 23.75, 64);
        const ringTexture = loadTexture("textures/saturn_ring.jpg");
        const ringMaterial = new THREE.MeshStandardMaterial({
            map: ringTexture,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5
        });

        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.position.set(0, 0, 0); // Il reste centré sur Saturne
        ringMesh.rotation.x = Math.PI / 2; 
        mesh.add(ringMesh);
    }

    // 🏷️ **Ajout d’une étiquette 3D (sprite)**
    const labelCanvas = document.createElement('canvas');
    const context = labelCanvas.getContext('2d');
    labelCanvas.width = 256;
    labelCanvas.height = 128;

    context.font = 'Bold 48px Arial';
    context.fillStyle = '#fff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(planet.name, 128, 64);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture,depthWrite: false });
    const label = new THREE.Sprite(labelMaterial);

    label.scale.set(planet.size * 20, planet.size * 10, 1); // Taille adaptable
    label.position.set(0, planet.size * 2.5, 0); // Position juste au-dessus de la planète

    mesh.add(label); // 🔥 Attache l’étiquette à la planète

    scene.add(mesh);

    planetTable.push({
        mesh,
        speed: planet.speed,
        angle: 0,
        camDistanceButton: planet.camDistanceButton,
        semiMajorAxis, 
        semiMinorAxis,
        focalDistance,
        label
    });
});


function updateLabels() {
  planetTable.forEach(planet => {
    const distance = camera.position.distanceTo(planet.mesh.position);
    const scaleFactor = distance * 0.15; // Ajuste dynamiquement la taille

    planet.label.scale.set(scaleFactor, scaleFactor / 2, 1);

    // Masquer le label du Soleil
    if (planet.mesh.name.toLowerCase() === 'sun') {
      planet.label.visible = false;
    } else {
      planet.label.visible = camera.position.y > 2000 || camera.position.y < -2000; // Afficher seulement si caméra y > 2000

      const name = planet.mesh.name.toLowerCase();
      let labelText;

      // Définir le texte initial des étiquettes
      switch (name) {
        case 'mercure':
          labelText = 'Mercure';
          break;
        case 'vénus':
          labelText = 'Vénus';
          break;
        case 'terre':
          labelText = 'Terre';
          break;
        case 'mars':
          labelText = 'Mars';
          break;
        default:
          labelText = planet.mesh.name;
      }

      // Changer le texte si la caméra est au-dessus de 45000
      if (camera.position.y > 45000) {
        switch (name) {
          case 'mercure':
            labelText = 'Me';
            break;
          case 'vénus':
            labelText = 'Vé';
            break;
          case 'terre':
            labelText = 'Te';
            break;
          case 'mars':
            labelText = 'Ma';
            break;
        }
      }

      // Mettre à jour le texte du label
      const context = planet.label.material.map.image.getContext('2d');
      context.clearRect(0, 0, 256, 128); // Efface le canvas
      context.font = 'Bold 48px Arial';
      context.fillStyle = '#fff';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(labelText, 128, 64);

      // Mettre à jour la texture du label
      planet.label.material.map.needsUpdate = true;
    }
  });
}






// Position de la caméra
camera.position.z = 2000;

// Gestion du zoom et de la rotation avec la souris
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; //amorce fluide des mvts
controls.dampingFactor = 0.25; //facteur d'inertie
controls.zoomSpeed = 1;

// Gestion du temps (accélération et retour en arrière)
let timeSpeed = 1;
let isPaused = false;

document.getElementById('accelerate-btn').addEventListener('click', () => {
  timeSpeed *= 2;
  console.log("Accélérer: ", timeSpeed);
});
document.getElementById('decelerate-btn').addEventListener('click', () => {
  timeSpeed /= 2;
  console.log("Ralentir: ", timeSpeed);
});
document.getElementById('stop-btn').addEventListener('click', () => {
  isPaused = !isPaused;
  console.log("Pause: ", isPaused);

  if (isPaused) {
    sunVideo.pause();
  } else {
    sunVideo.play();
  }
  updateTimeDisplay(); // Mettre à jour l'affichage
});









document.getElementById('view-syst-btn').addEventListener('click', () => focusOnView('syst'));
document.getElementById('view-sun-btn').addEventListener('click', () => focusOnPlanet('Sun'));
document.getElementById('view-mercury-btn').addEventListener('click', () => focusOnPlanet('Mercure'));
document.getElementById('view-venus-btn').addEventListener('click', () => focusOnPlanet('Vénus'));
document.getElementById('view-earth-btn').addEventListener('click', () => focusOnPlanet('Terre'));
document.getElementById('view-mars-btn').addEventListener('click', () => focusOnPlanet('Mars'));
document.getElementById('view-jupiter-btn').addEventListener('click', () => focusOnPlanet('Jupiter'));
document.getElementById('view-saturn-btn').addEventListener('click', () => focusOnPlanet('Saturne'));
document.getElementById('view-uranus-btn').addEventListener('click', () => focusOnPlanet('Uranus'));
document.getElementById('view-neptune-btn').addEventListener('click', () => focusOnPlanet('Neptune'));


let elapsedTime = 0; // Temps écoulé en heures
let lastUpdateTime = performance.now();

function updateTimeDisplay() {
    document.getElementById('time-speed').textContent = timeSpeed + 'x';
    document.getElementById('time-status').textContent = isPaused ? 'Pause' : ' ';

    let elapsedDays = elapsedTime / 24;
    let elapsedYears = elapsedTime / 8760;

    document.getElementById('elapsed-hours').textContent = Math.floor(elapsedTime);
    document.getElementById('elapsed-days').textContent = Math.floor(elapsedDays);
    document.getElementById('elapsed-years').textContent = elapsedYears.toFixed(1);
}

// Fonction pour mettre à jour le temps écoulé
function updateElapsedTime() {
    let now = performance.now();
    if (!isPaused) {
        let deltaTime = (now - lastUpdateTime) / 1000; // Convertir en secondes
        elapsedTime += deltaTime * timeSpeed; // Ajout avec la vitesse du temps
    }
    lastUpdateTime = now;
    updateTimeDisplay();
}

// Modifier la vitesse du temps
function changeTimeSpeed(factor) {
    timeSpeed *= factor;
    updateTimeDisplay();
}


// Écouteurs pour les boutons de contrôle
document.getElementById('accelerate-btn').addEventListener('click', () => changeTimeSpeed(2));
document.getElementById('decelerate-btn').addEventListener('click', () => changeTimeSpeed(0.5));



function closeAllWindows() {
  document.querySelectorAll('.info-window').forEach(window => {
      if (window) {
          window.style.display = 'none';
      }
  });
}


function focusOnView() {
  focusedPlanet = null;
  closeAllWindows(); // Ferme les autres fenêtres


  camera.position.y = 200000;
  controls.target.set(0, 0, 0);
  controls.update();

  setTimeout(() => {
    camera.position.y += 1;
    controls.update();
    camera.position.y -= 1;
    controls.update();
  }, 50);
}


let focusedPlanet = null;
let isFollowingPlanet = false;
let cameraOffset = new THREE.Vector3(); // Offset fixe pour éviter l’éloignement


function focusOnPlanet(planetName) {
  const planet = scene.getObjectByName(planetName);
    if (planet) {
      focusedPlanet = planetTable.find(p => p.mesh.name === planetName);
      isFollowingPlanet = true; 

      if (focusedPlanet) {
        // Fixe l'offset initial basé sur la distance requise
        cameraOffset.set(focusedPlanet.camDistanceButton, -focusedPlanet.camDistanceButton * 0.2, focusedPlanet.camDistanceButton);
      }
      
      closeAllWindows(); // Ferme les autres fenêtres

      let infoWindow = document.getElementById(planet.name + '-info');

      if (!infoWindow) {
        // Créer la fenêtre si elle n'existe pas encore
        infoWindow = document.createElement('div');
        infoWindow.id = planet.name + '-info';
        infoWindow.className = 'info-window';
        infoWindow.style.position = 'absolute';
        infoWindow.style.top = '25%';
        infoWindow.style.marginLeft = '55%';
        infoWindow.style.width = '20em';
        infoWindow.style.height = '50%';
        infoWindow.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        infoWindow.style.color = 'white';
        infoWindow.style.fontSize = '16px';
        infoWindow.style.border = '1px solid white';
        infoWindow.style.borderRadius = '10px';
        infoWindow.style.display = 'none';
        document.body.appendChild(infoWindow);
      }

      if (infoWindow.style.display === 'block') {
          infoWindow.style.display = 'none';
      } else {
          infoWindow.innerHTML = `<h3>${planet.name}</h3><p>Ici bientôt des données fiables :)</p>`;
          infoWindow.style.display = 'block';
      }
      adjustForMobile();

    }
}



function animate() {
  TWEEN.update();
  requestAnimationFrame(animate);

  if (!isPaused) {
    planetTable.forEach((planet) => {
      planet.angle += planet.speed * timeSpeed * 0.01;
      planet.mesh.position.x = Math.cos(planet.angle) * planet.semiMajorAxis - planet.focalDistance;
      planet.mesh.position.z = Math.sin(planet.angle) * planet.semiMinorAxis;
      planet.mesh.rotation.y += planet.speed * timeSpeed * 0.05;

      if (planet.name === "Saturne" && planet.mesh.children.length > 0) {
        planet.mesh.children[0].position.copy(planet.mesh.position);
      }
    });
  }

  if (focusedPlanet && isFollowingPlanet) {
    // Nouvelle position de la caméra en gardant l’offset constant
    const desiredPosition = focusedPlanet.mesh.position.clone().add(cameraOffset);

    camera.position.copy(desiredPosition); // 🔥 Déplacement immédiat (plus fluide)
    camera.lookAt(focusedPlanet.mesh.position); // 🔥 Garde la planète en centre de vue
    controls.target.copy(focusedPlanet.mesh.position);
  }

  
  // Appliquer la texture animée au Soleil
  const sun = planetTable.find(p => p.mesh.name === "Sun");
  if (sun) {
    sun.mesh.material.map = sunTexture;
    sun.mesh.material.needsUpdate = true;
    sun.mesh.add(eruptionParticles);
  }


  updateElapsedTime();
  updateLabels(); //Affichege des étiquettes et scaling

  renderer.render(scene, camera);
}
  




// Ajout des orbites 
planets.forEach((planet) => {
  const semiMajorAxis = (planet.aphelie + planet.periphelie) / 2; // Demi-grand axe
  const semiMinorAxis = Math.sqrt(planet.aphelie * planet.periphelie); // Demi-petit axe (approximation basée sur la 2e loi de Kepler)

  const focalDistance = semiMajorAxis - planet.periphelie; // Décalage du centre de l'ellipse

  const curve = new THREE.EllipseCurve(
    -focalDistance, 0, // Décalage pour centrer le Soleil sur un foyer
    semiMajorAxis, semiMinorAxis, // Demi-axes basés sur aphélie et périhélie
    0, 2 * Math.PI, false, 0
  );

  const points = curve.getPoints(10000);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: planet.orbitColor});
  const ellipse = new THREE.Line(geometry, material);

  ellipse.rotation.x = Math.PI / 2; // Placer l’orbite dans le plan X-Z
  ellipse.visible = false; // ❌ Cacher l’orbite par défaut
  scene.add(ellipse);
});


let orbitVisible = false;
function toggleOrbits() {
  orbitVisible = !orbitVisible;
  scene.children.forEach(obj => {
    if (obj instanceof THREE.Line) {
      obj.visible = orbitVisible;
    }
  });
}
document.getElementById('toggle-orbits-btn').addEventListener('click', toggleOrbits);


function setupCameraControls() {
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.zoomSpeed = 1;

  // Activation du zoom et définition des limites
  controls.enableZoom = true;
  controls.minDistance = 1; // Permet un zoom rapproché
  controls.maxDistance = 1000000; // Empêche d’aller trop loin
}



function adjustForMobile() {
  if (window.innerWidth <= 768) { // 📱 Si écran ≤ 768px (tablette/téléphone)
    document.querySelectorAll("button").forEach(button => {
      button.style.fontSize = "11px";
      button.style.padding = "5px 10px";
    });

     const infoPanel = document.getElementById("info-panel");
     if (infoPanel) {
       infoPanel.style.fontSize = "10px";
       infoPanel.style.padding = "7px";
     }

    document.querySelectorAll(".info-window").forEach(infoWindow => {
      infoWindow.style.width = "25%";
      infoWindow.style.height = "40%";
      infoWindow.style.top = "35%";
      infoWindow.style.marginLeft = "70%";
      infoWindow.style.fontSize = "11px";
    });
  }
}

// ✅ Exécuter au chargement + sur redimensionnement
adjustForMobile();
window.addEventListener("resize", adjustForMobile);






setupCameraControls();
resizeScene();
animate();

// Style CSS pour s'assurer que le canvas prend toute la place

document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";

console.log("main.js chargé");
planets.forEach((planet) => {
  const texture = loadTexture(planet.texture);
  if (!texture) console.warn(`⚠️ Texture introuvable pour ${planet.name}`);
});
