import * as THREE from 'three';

// Anneaux planétaires — deux variantes :
//   1. TEXTURÉS (Saturne) : passer une texture, UV radiales remappées.
//   2. PROCÉDURAUX (Jupiter, Uranus, Neptune) : matériau plat coloré, opacité
//      faible, pour rendre visible la présence d'anneaux ténus.
//
// Allocation : 1 BufferGeometry + 1 Material + 1 Mesh, à l'init uniquement.

const RING_SEGMENTS = 128;

function buildGeometry(innerAu, outerAu, withUvRemap) {
  if (!(outerAu > innerAu && innerAu > 0)) {
    throw new RangeError('createRingSystem: rayons invalides');
  }
  const geom = new THREE.RingGeometry(innerAu, outerAu, RING_SEGMENTS, 1);
  if (withUvRemap) {
    const pos = geom.attributes.position;
    const uv = geom.attributes.uv;
    const span = outerAu - innerAu;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      uv.setXY(i, (r - innerAu) / span, 0.5);
    }
    uv.needsUpdate = true;
  }
  return geom;
}

/**
 * @param {{innerAu:number, outerAu:number, color?:number, opacity?:number}} params
 * @param {THREE.Texture|null} [texture]
 */
export function createRingSystem(params, texture = null) {
  const geometry = buildGeometry(params.innerAu, params.outerAu, Boolean(texture));

  const material = new THREE.MeshBasicMaterial({
    map: texture ?? null,
    color: texture ? 0xffffff : (params.color ?? 0xb8b3aa),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: texture ? 0.9 : (params.opacity ?? 0.25),
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Ring';
  return mesh;
}
