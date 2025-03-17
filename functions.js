// Fonction pour charger une texture à partir d'un chemin donné (grâce à THREE)
export function loadTexture(path) {
    const loader = new THREE.TextureLoader();
    return loader.load(path);
  }
console.log("functions.js chargé");
