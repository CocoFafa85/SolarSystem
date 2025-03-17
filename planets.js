// Données des planètes : nom, taille, distance du soleil, vitesse orbitale, texture
export const planets = [
    { name: "Mercure", size: 0.38, speed: 0.02, texture: "textures/mercury.jpg", camDistanceButton: 1.52,
      aphelie: 5514.66, periphelie: 3637.33, obliquity : 0.03 },

    { name: "Vénus", size: 0.95, speed: 0.015, texture: "textures/venus.jpg", camDistanceButton: 3.80,
      aphelie: 8544.68, periphelie: 8429.58, obliquity : 177.36 },

    { name: "Terre", size: 1, speed: 0.01, texture: "textures/earth.jpg", camDistanceButton: 4, 
      orbitColor: "#503bf4",  aphelie: 11929.38, periphelie: 11537.26, obliquity : 23.44 },

    { name: "Mars", size: 0.53, speed: 0.008, texture: "textures/mars.jpg", camDistanceButton: 2.12,
      aphelie: 19547.96, periphelie: 16208.42, obliquity : 25.19 },

    { name: "Jupiter", size: 11, speed: 0.004, texture: "textures/jupiter.jpg", camDistanceButton: 44,
      aphelie: 64000.62, periphelie: 58092.89, obliquity : 3.12},

    { name: "Saturne", size: 9.5, speed: 0.003, texture: "textures/saturn.jpg", camDistanceButton: 38,
      aphelie: 117949.97, periphelie: 105869.84, obliquity : 26.73 },

    { name: "Uranus", size: 4, speed: 0.002, texture: "textures/uranus.jpg", camDistanceButton: 16,
      aphelie: 235793.00, periphelie: 214512.26, obliquity : 97.8 },

    { name: "Neptune", size: 3.88, speed: 0.001, texture: "textures/neptune.jpg", camDistanceButton: 15.52,
      aphelie: 355848.43, periphelie: 349789.34, obliquity : 29.58 },

    { name: "Sun", size: 110, speed: 0.045, texture: "textures/sun.jpg", camDistanceButton: 440,
      aphelie: 0, periphelie: 0, obliquity : 0 },

];
  console.log("planets.js chargé");
