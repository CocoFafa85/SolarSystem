// Horloge de simulation pure (aucune dépendance DOM/Three).
// Sémantique :
//   - `speed` est en HEURES SIMULÉES PAR SECONDE RÉELLE (positive, négative ou nulle).
//   - `elapsedHours` est l'intégrale temporelle de speed depuis `start()`.
//   - L'état pause gèle l'intégration sans perte du compteur.
//
// Zéro-allocation : un unique objet snapshot pré-alloué, muté à chaque tick.
// Le service appelant peut le ré-émettre tel quel ; aucun `new` dans la boucle.

const DEFAULT_SPEED = 1; // 1 heure simulée / s réelle

export class SimulationClock {
  // LOT 10 — cap relevé ±16384 → ±131072 (×8). Audit Profile B : à ×131072 et
  // 60 fps, deltaHours ≈ 2186 h/frame ≈ 91 j/frame. EclipseTracker sub-step 1 h
  // ⇒ ~2186 sous-étapes/frame, Kepler analytique reste correct (cf. test
  // tests/timeSpeed.cap.test.js : conservation E orbitale Terre < 1 ppm sur 1 an
  // simulé à dt=2200 h vs dt=24 h).
  constructor({ initialSpeed = DEFAULT_SPEED, minSpeed = -131072, maxSpeed = 131072 } = {}) {
    if (!Number.isFinite(initialSpeed)) {
      throw new TypeError('SimulationClock: initialSpeed non fini');
    }
    if (!Number.isFinite(minSpeed) || !Number.isFinite(maxSpeed) || minSpeed >= maxSpeed) {
      throw new RangeError('SimulationClock: bornes de vitesse invalides');
    }
    this._minSpeed = minSpeed;
    this._maxSpeed = maxSpeed;
    this._speed = this._clampSpeed(initialSpeed);
    this._paused = false;
    this._elapsedHours = 0;
    this._lastTickSeconds = null;       // timestamp réel du dernier tick
    this._snapshot = {                  // payload réutilisé — NE PAS recréer
      speed: this._speed,
      paused: false,
      elapsedHours: 0,
      deltaHours: 0,
    };
  }

  _clampSpeed(s) {
    if (s < this._minSpeed) return this._minSpeed;
    if (s > this._maxSpeed) return this._maxSpeed;
    return s;
  }

  /**
   * Démarre / redémarre l'horloge. Appelé une fois par animate().
   * @param {number} nowSeconds  performance.now() / 1000 ou équivalent.
   */
  start(nowSeconds) {
    if (!Number.isFinite(nowSeconds)) {
      throw new TypeError('SimulationClock.start: nowSeconds non fini');
    }
    this._lastTickSeconds = nowSeconds;
  }

  /**
   * Intègre un pas de temps. À appeler à chaque frame.
   * @param {number} nowSeconds
   * @returns {number} deltaHours simulées sur ce tick
   */
  tick(nowSeconds) {
    if (this._lastTickSeconds === null) {
      this.start(nowSeconds);
      return 0;
    }
    const dtReal = nowSeconds - this._lastTickSeconds;
    this._lastTickSeconds = nowSeconds;
    if (this._paused || dtReal <= 0) {
      this._snapshot.deltaHours = 0;
      return 0;
    }
    const dHours = dtReal * this._speed;
    this._elapsedHours += dHours;
    this._snapshot.deltaHours = dHours;
    return dHours;
  }

  /** Snapshot mutable réutilisé (zéro-alloc). */
  getSnapshot() {
    const s = this._snapshot;
    s.speed = this._speed;
    s.paused = this._paused;
    s.elapsedHours = this._elapsedHours;
    return s;
  }

  // --- Commandes (idempotentes, sûres pendant un tick) ---------------------

  setSpeed(speed) {
    if (!Number.isFinite(speed)) {
      throw new TypeError('setSpeed: speed non fini');
    }
    this._speed = this._clampSpeed(speed);
  }

  stepSpeed(factor) {
    if (!Number.isFinite(factor) || factor === 0) {
      throw new RangeError('stepSpeed: factor doit être fini et non nul');
    }
    // Depuis 0 la multiplication ferait perdre le signe — on adopte directement
    // le facteur comme nouvelle vitesse (sémantique "reprise au pas demandé").
    const next = this._speed === 0 ? factor : this._speed * factor;
    this.setSpeed(next);
  }

  setPaused(paused) { this._paused = !!paused; }
  togglePause() { this._paused = !this._paused; }
  isPaused() { return this._paused; }
  getSpeed() { return this._speed; }
  getElapsedHours() { return this._elapsedHours; }

  /** Remet à zéro l'écoulé et oublie la référence temporelle. */
  reset() {
    this._elapsedHours = 0;
    this._lastTickSeconds = null;
    this._snapshot.deltaHours = 0;
  }
}
