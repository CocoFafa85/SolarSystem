import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifySolarEclipse,
  classifyLunarEclipse,
  classifySuperMoon,
} from '../src/physics/eclipses.js';

// Rayons en UA — cohérents bodies.json
const R_SUN = 0.0046524;
const R_EARTH = 0.00004263;
const R_MOON = 0.00001161;
const D_EARTH_MOON_MEAN = 0.00257;

const SUN = { x: 0, y: 0, z: 0 };
const EARTH = { x: 1, y: 0, z: 0 };

// --- ÉCLIPSE SOLAIRE -------------------------------------------------------

test('Solar eclipse: alignement parfait Sun-Moon-Earth, Lune au périgée → totale', () => {
  // Arrange : à distance moyenne le rayon angulaire lunaire est légèrement
  // inférieur au solaire (cas réel d'éclipse annulaire). Pour une éclipse totale
  // il faut la Lune au périgée (≈ 0.00243 UA).
  const D_PERIGEE = 0.00243;
  const moon = { x: 1 - D_PERIGEE, y: 0, z: 0 };
  // Précondition : rayon angulaire Lune > Soleil
  assert.ok(R_MOON / D_PERIGEE > R_SUN / 1, 'précondition test');
  // Act
  const r = classifySolarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON);
  // Assert
  assert.equal(r, 'total');
});

test('Solar eclipse: Lune derrière la Terre → aucune éclipse solaire', () => {
  const moon = { x: 1 + D_EARTH_MOON_MEAN, y: 0, z: 0 };
  assert.equal(classifySolarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON), 'none');
});

test('Solar eclipse: Lune à 90° de la direction Soleil → aucune', () => {
  const moon = { x: 1, y: D_EARTH_MOON_MEAN, z: 0 };
  assert.equal(classifySolarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON), 'none');
});

test('Solar eclipse: léger décalage angulaire → partielle', () => {
  // Arrange : Lune au périgée, décalée d'un angle sep tel que
  //   |rS - rM| < sep < rS + rM   (recouvrement partiel)
  const D_PERIGEE = 0.00243;
  const sepRad = 0.005; // ≈ 17' — entre |rS-rM|≈3e-4 et rS+rM≈9e-3
  // Position depuis la Terre, à distance D_PERIGEE, décalée de sepRad de la direction du Soleil.
  const moon = {
    x: 1 - D_PERIGEE * Math.cos(sepRad),
    y: -D_PERIGEE * Math.sin(sepRad),
    z: 0,
  };
  // Act
  const r = classifySolarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON);
  // Assert
  assert.equal(r, 'partial');
});

test('Solar eclipse: Lune plus loin (apogée fictif) → annulaire', () => {
  // Arrange : on éloigne la Lune pour que son rayon angulaire passe SOUS celui du Soleil.
  // R_moon / d_moon < R_sun / d_sun ⇒ d_moon > R_moon * d_sun / R_sun
  const dMoonFar = R_MOON / R_SUN * 0.999 + 0.001; // garantit ratio inversé proche de 1
  // On force avec un d_moon nettement plus grand pour stabilité
  const dMoon = 0.01;
  const moon = { x: 1 - dMoon, y: 0, z: 0 };
  // Vérifier hypothèse : rMoon_ang < rSun_ang
  assert.ok(R_MOON / dMoon < R_SUN / 1, 'précondition test');
  // Act
  const r = classifySolarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON);
  // Assert
  assert.equal(r, 'annular');
  // Silence un éventuel unused
  void dMoonFar;
});

// --- ÉCLIPSE LUNAIRE -------------------------------------------------------

test('Lunar eclipse: pleine lune alignée → totale', () => {
  // Arrange : Lune diamétralement opposée au Soleil derrière la Terre
  const moon = { x: 1 + D_EARTH_MOON_MEAN, y: 0, z: 0 };
  // Act
  const r = classifyLunarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON);
  // Assert
  assert.equal(r, 'total');
});

test('Lunar eclipse: Lune entre Soleil et Terre (nouvelle lune) → none', () => {
  const moon = { x: 1 - D_EARTH_MOON_MEAN, y: 0, z: 0 };
  assert.equal(classifyLunarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON), 'none');
});

test('Lunar eclipse: Lune en quadrature → none', () => {
  const moon = { x: 1, y: D_EARTH_MOON_MEAN, z: 0 };
  assert.equal(classifyLunarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON), 'none');
});

test('Lunar eclipse: Lune dans la pénombre uniquement → penumbral', () => {
  // Décalage perpendiculaire suffisant pour sortir de l'umbra mais rester dans la pénombre.
  // r_umbra à la Lune ≈ R_earth - (R_sun - R_earth) * d_em / d_es
  //                  ≈ 0.00004263 - (0.0046524 - 0.00004263) * 0.00257 / 1
  //                  ≈ 0.00004263 - 1.184e-5 = 3.08e-5 UA
  // r_penumbra ≈ R_earth + (R_sun + R_earth) * d_em / 1
  //            ≈ 0.00004263 + 1.207e-5 = 5.47e-5 UA
  // Pour entrer en pénombre seule : R_earth + 1.5e-5 ≈ 5.7e-5 (sup à r_umbra+R_moon mais inf à r_pen+R_moon)
  const moon = { x: 1 + D_EARTH_MOON_MEAN, y: 5.0e-5, z: 0 };
  assert.equal(classifyLunarEclipse(R_SUN, EARTH, R_EARTH, moon, R_MOON), 'penumbral');
});

// --- SUPER LUNE ------------------------------------------------------------

test('Super moon: pleine lune au périgée → true', () => {
  // Arrange : pleine lune ⇔ Sun-Earth aligné avec Earth→Moon dans le même sens
  // ⇒ moon = earth + small along sunToEarth (+x)
  const moon = { x: 1 + 0.92 * D_EARTH_MOON_MEAN, y: 0, z: 0 };
  // Act
  const r = classifySuperMoon(EARTH, moon, D_EARTH_MOON_MEAN);
  // Assert
  assert.equal(r, true);
});

test('Super moon: pleine lune à distance moyenne → false', () => {
  const moon = { x: 1 + D_EARTH_MOON_MEAN, y: 0, z: 0 };
  assert.equal(classifySuperMoon(EARTH, moon, D_EARTH_MOON_MEAN), false);
});

test('Super moon: nouvelle lune même proche du périgée → false (mauvaise phase)', () => {
  const moon = { x: 1 - 0.92 * D_EARTH_MOON_MEAN, y: 0, z: 0 };
  assert.equal(classifySuperMoon(EARTH, moon, D_EARTH_MOON_MEAN), false);
});
