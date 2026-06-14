# 🪐 Solar System — Simulation 1:1

[![Deploy](https://github.com/CocoFafa85/SolarSystem/actions/workflows/deploy.yml/badge.svg)](https://github.com/CocoFafa85/SolarSystem/actions/workflows/deploy.yml)

**Simulateur 3D du système solaire à l'échelle astronomique stricte** — Three.js r184, échelle 1:1 réelle (Soleil 0.00464 UA de rayon, Terre à 1 UA, etc.), temps simulé contrôlable jusqu'à ×131072, détection runtime des événements astronomiques (éclipses, super-lunes, éruptions solaires).

🌐 **Live** : https://cocofafa85.github.io/SolarSystem/

---

## Ce que c'est

Un site statique pédagogique pour **se rendre compte physiquement des ordres de grandeur de l'espace**. L'échelle 1:1 stricte signifie que :

- Le Soleil est un petit disque de 0.0093 UA de diamètre.
- 107 Soleils alignés tiennent entre le Soleil et la Terre au périhélie.
- La Lune est à 60 rayons terrestres de la Terre (et apparaît correctement éloignée).
- Neptune est à 30× la distance Terre-Soleil.

Pas de tricherie visuelle, pas de planètes gonflées, pas de distances raccourcies. **L'espace est vide.**

## Fonctionnalités

- **Caméra** : 3 presets (system/inner/outer), focus sur astre au clic, preview hover sur menu, clic droit pan/rotate adaptatif.
- **Temps simulé** : pause, ½×/1×/2×, jusqu'à ×131072, reset retour J2000.
- **Catalogue** : 8 planètes + Lune + Pluton + Cérès + 12 comètes + ceinture d'astéroïdes (InstancedMesh).
- **Événements** : éclipses solaires/lunaires (3 types), super-lunes, éruptions solaires (cycle 11 ans).
- **Comparateurs** : Distance, Masse, Taille, T°, Vitesse orbitale, Vitesse rotative.
- **Glossaire** : 38 termes astronomiques avec overlays SVG animés au hover.

## Stack

- **Three.js r184** + addons (OrbitControls).
- **Vite 5** pour le build statique.
- **node:test** pour la suite unitaire (206 tests).
- **GitHub Pages from Actions** pour le déploiement.

## Commandes

```bash
npm ci             # install
npm test           # 206 tests verts
npm run dev        # dev server (port 5173)
npm run build      # build prod → dist/
npm run preview    # serve dist/ localement
```

## Documentation

- [`PLAN.md`](PLAN.md) — historique complet des 14 LOTs.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — architecture de déploiement.
- [`RUNBOOK.md`](RUNBOOK.md) — scénarios incident.
- [`RELEASE_NOTES.md`](RELEASE_NOTES.md) — changelog v1.0.0.
- [`OBSERVABILITY.md`](OBSERVABILITY.md) — N/A justifié (site statique).
- [`PROJECT.md`](PROJECT.md) — règles de stack et conventions.

## Licence

Projet portfolio personnel. Données orbitales : sources NASA/JPL publiques.

## Crédits

Données : NASA Planetary Fact Sheet · JPL SBDB · JPL Horizons · NASA Eclipse Catalog · NOAA SWPC.
