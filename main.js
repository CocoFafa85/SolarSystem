import { planets } from './planets.js';
import { loadTexture } from './functions.js';


const scene = new THREE.Scene(); 
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 1000000); //champ de vision de en degrés/ un rapport d'aspect basé sur la taille de la fenêtre/ et des plans de coupe proche et lointain
const renderer = new THREE.WebGLRenderer(); // Permet un rendu 3D dans un naviguateur
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let isZooming = false;
window.addEventListener("wheel", (event) => {
  if (event.deltaY !== 0) { //Détecte si la molette est utilisée 
    isZooming = true; //Désactive temporairement le déplacement du fond 
  } else {
    isZooming = false;
  }
});



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

const spaceTexture = new THREE.TextureLoader().load("textures/stars_milkyway.jpg");
// const spaceTexture = new THREE.TextureLoader().load("textures/stars.jpg");
spaceTexture.wrapS = THREE.RepeatWrapping; //Active un mode répétitif de texture 
spaceTexture.wrapT = THREE.RepeatWrapping;
scene.background = spaceTexture;

// Ajout des planètes
const planetTable = [];
planets.forEach((planet) => {
  const geometry = new THREE.SphereGeometry(planet.size, 128, 128);
  const material = new THREE.MeshStandardMaterial({ map: loadTexture(planet.texture) });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.z = THREE.MathUtils.degToRad(planet.obliquity || 0); //degToRad permet deconvertir l'angle ° en radian. Utilisé par Three. Donc c'est : planet.obliquity * (Math.PI / 180)
  mesh.name = planet.name;

  // Placement initial au périhélie (point le plus proche du Soleil)
  const semiMajorAxis = (planet.aphelie + planet.periphelie) / 2;
  const semiMinorAxis = Math.sqrt(planet.aphelie * planet.periphelie);
  const focalDistance = semiMajorAxis - planet.periphelie;

  mesh.position.x = Math.cos(0) * semiMajorAxis - focalDistance;
  mesh.position.z = Math.sin(0) * semiMinorAxis;
  mesh.position.y = 0; 
  console.log(`✅ Position initiale ${planet.name} → X: ${mesh.position.x}, Z: ${mesh.position.z}`);

  //Ajout anneaux de Saturne
  if (planet.name === "Saturne") {
    const ringGeometry = new THREE.RingGeometry(17.1, 23.75, 64);
    const ringTexture = loadTexture("textures/saturn_ring.jpg");
    const ringMaterial = new THREE.MeshStandardMaterial({
      map: ringTexture,
      side: THREE.DoubleSide, //Permet d'afficher la texture des deux côtés du ring (évite que l’anneau soit invisible sous certains angles)
      transparent: true,
      alphaTest: 0.5,
    });
  
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  
    // Appliquer l'inclinaison des anneaux selon l'obliquité de Saturne
    ringMesh.position.set(0, 0, 0); // Il reste centré sur Saturne
    ringMesh.rotation.x = Math.PI / 2; // Math.PI / 2 (90°) aligne les anneaux avec le plan orbital. Cela fonctionne car Three.js place par défaut les anneaux dans le plan X-Y, donc une rotation de 90° autour de X les oriente dans le plan X-Z (transversal)
    
    // Attacher l’anneau à Saturne
    ringMesh.position.copy(mesh.position);
    mesh.add(ringMesh);
  }
  

  scene.add(mesh);

  planetTable.push({
    mesh,
    speed: planet.speed,
    angle: 0, // Commencer l'orbite au point initial
    camDistanceButton: planet.camDistanceButton,
    semiMajorAxis, 
    semiMinorAxis,
    focalDistance
  });
});




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

let focusedPlanet = null;

function focusOnPlanet(planetName) {
  const planet = planetTable.find(p => p.mesh.name === planetName);

  if (planet) {
    focusedPlanet = planet;

    // Ajuster la caméra autour de la planète
    const distance = planet.camDistanceButton;
    camera.position.set(
      planet.mesh.position.x + distance,
      planet.mesh.position.y + distance,
      planet.mesh.position.z + distance
    );

    // Mise à jour de l'axe de rotation autour de la planète
    controls.target.copy(planet.mesh.position);
    controls.enableRotate = true; 
    controls.update();
  }
}


function focusOnView() {
  focusedPlanet = null;
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


//Animation
function animate() {
if (!isPaused) {
  planetTable.forEach((planet) => {
    planet.angle += planet.speed * timeSpeed * 0.01;

    planet.mesh.position.x = Math.cos(planet.angle) * planet.semiMajorAxis - planet.focalDistance;
    planet.mesh.position.z = Math.sin(planet.angle) * planet.semiMinorAxis;

    planet.mesh.rotation.y += planet.speed * timeSpeed * 0.05;

    if (planet.name === "Saturne" && planet.mesh.children.length > 0) {
      planet.mesh.children[0].position.copy(planet.mesh.position);
    }

    if (focusedPlanet && focusedPlanet.mesh.name === "Saturne") {
      focusedPlanet.mesh.children.forEach(child => {
        child.position.set(0, 0, 0); // L'anneau reste toujours centré sur Saturne
      });
    }
    
  });
}

if (!isZooming) {
  // Déplacement du fond uniquement en fonction des mouvements latéraux (X et Y), pas du zoom (Z)
  scene.background.offset.x = (camera.position.x * 0.0001) % 1;
  scene.background.offset.y = (camera.position.y * 0.0001) % 1;
}


if (focusedPlanet) {
  const distance = focusedPlanet.camDistanceButton;
  camera.position.set(
    focusedPlanet.mesh.position.x + distance,
    focusedPlanet.mesh.position.y + distance,
    focusedPlanet.mesh.position.z + distance
  );
  controls.target.set(
    focusedPlanet.mesh.position.x,
    focusedPlanet.mesh.position.y,
    focusedPlanet.mesh.position.z
  );
  controls.update();
}

requestAnimationFrame(animate);
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

  const points = curve.getPoints(1000);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: planet.orbitColor || "#ffffff"});
  const ellipse = new THREE.Line(geometry, material);

  ellipse.rotation.x = Math.PI / 2; // Placer l’orbite dans le plan X-Z
  scene.add(ellipse);
});



function setupCameraControls() {
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.zoomSpeed = 1;

  // Activation du zoom et définition des limites
  controls.enableZoom = true;
  controls.minDistance = 1; // Permet un zoom rapproché
  controls.maxDistance = 1000000; // Empêche d’aller trop loin
}

setupCameraControls();

animate();


console.log("main.js chargé");
planets.forEach((planet) => {
  const texture = loadTexture(planet.texture);
  if (!texture) console.warn(`⚠️ Texture introuvable pour ${planet.name}`);
});
