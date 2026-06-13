// PlanetStateBuffer — Structure-of-Arrays héliocentrique zéro-allocation.
//
// Pourquoi : un updater RAF qui ferait `mesh.position.set(vector.x, vector.y, vector.z)`
// avec un `Vector3` recalculé par planète et par frame alloue à 60 Hz × N corps.
// Ce buffer impose un protocole indexé :
//
//   1) Init : registerBody(id) → renvoie un index stable.
//   2) RAF  : positions[index*3 + 0/1/2] = x/y/z (Float64Array, écriture directe).
//   3) RAF  : applyToNode(index, node) lit le buffer et fait `node.position.set(...)`.
//
// Aucun `new Vector3()`, aucun objet intermédiaire — tout reste en mémoire typée.

const STRIDE = 3;
const INITIAL_CAPACITY = 16;

export class PlanetStateBuffer {
  constructor(capacity = INITIAL_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('PlanetStateBuffer: capacity doit être un entier > 0');
    }
    this._capacity = capacity;
    this._size = 0;
    this._ids = new Array(capacity);
    this._indexById = new Map();
    // Float64 — la position héliocentrique varie de 1e-5 UA (Lune autour Terre)
    // à 30 UA (Neptune). Float32 perdrait la précision relative satellite.
    this.positions = new Float64Array(capacity * STRIDE);
    this.velocities = new Float64Array(capacity * STRIDE);
  }

  registerBody(id) {
    if (typeof id !== 'string' || !id) {
      throw new TypeError('registerBody: id string requis');
    }
    if (this._indexById.has(id)) return this._indexById.get(id);
    if (this._size >= this._capacity) this._grow();
    const index = this._size++;
    this._ids[index] = id;
    this._indexById.set(id, index);
    return index;
  }

  indexOf(id) {
    const i = this._indexById.get(id);
    return i === undefined ? -1 : i;
  }

  /** Écriture directe — appelable depuis la RAF sans allocation. */
  setPosition(index, x, y, z) {
    const o = index * STRIDE;
    this.positions[o] = x;
    this.positions[o + 1] = y;
    this.positions[o + 2] = z;
  }

  /** Copie vers `node.position` sans allocation (mutation in-place). */
  applyToNode(index, node) {
    const o = index * STRIDE;
    node.position.set(this.positions[o], this.positions[o + 1], this.positions[o + 2]);
  }

  get size() { return this._size; }
  get capacity() { return this._capacity; }

  _grow() {
    const next = this._capacity * 2;
    const np = new Float64Array(next * STRIDE);
    const nv = new Float64Array(next * STRIDE);
    np.set(this.positions);
    nv.set(this.velocities);
    this.positions = np;
    this.velocities = nv;
    this._ids.length = next;
    this._capacity = next;
  }

  clear() {
    this._size = 0;
    this._ids.length = this._capacity;
    this._indexById.clear();
    this.positions.fill(0);
    this.velocities.fill(0);
  }
}
