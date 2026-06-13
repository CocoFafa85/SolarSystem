# Couche UI — Profile D

## Contrat de séparation (SoC)

```
+---------------------+        eventBus         +-----------------------+
|     src/ui/*        | <--------------------->  |     moteur 3D         |
| (DOM, CSS, i18n)    |   pub/sub asynchrone     | src/physics, scene/*  |
+---------------------+                          +-----------------------+
```

**Règles dures :**
- `src/ui/**` n'importe **JAMAIS** `three`, ni un module de `src/physics/**`, ni `src/scene/**`.
- Le moteur 3D n'accède **JAMAIS** au DOM directement. Il publie des événements ; l'UI s'y abonne.
- Toute communication transite par `core/eventBus.js`. Les canaux sont déclarés dans `core/channels.js`.
- Aucun texte en dur : tout passe par `locales/<lang>.json` via `core/i18n.js`.

## Arborescence

- `core/` — primitives découplées (event bus, i18n, breakpoints).
- `styles/` — tokens, reset, layout HUD. Mobile-first strict (base 375px).
- `index.js` — bootstrap UI, monté par `main.js` une fois le DOM prêt.

## Breakpoints (mobile-first)

| Nom | min-width | Cible |
|-----|-----------|-------|
| `--bp-sm` | 0px       | Mobile (≥ 375px) |
| `--bp-md` | 768px     | Tablette |
| `--bp-lg` | 1024px    | Desktop |
| `--bp-xl` | 1440px    | Large desktop |

Les media-queries s'écrivent **toujours** `min-width` (jamais `max-width`).
