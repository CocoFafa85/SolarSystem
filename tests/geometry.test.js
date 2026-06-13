import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeVec3, sub, add, scale, dot, length, lengthSq, angleBetween,
} from '../src/physics/geometry.js';

const EPS = 1e-12;

test('sub: zéro-alloc — retourne le buffer fourni', () => {
  const out = makeVec3();
  const a = makeVec3(3, 4, 5);
  const b = makeVec3(1, 1, 1);
  const r = sub(a, b, out);
  assert.equal(r, out);
  assert.deepEqual({ x: out.x, y: out.y, z: out.z }, { x: 2, y: 3, z: 4 });
});

test('add + scale composent correctement', () => {
  const out = makeVec3();
  add(makeVec3(1, 0, 0), makeVec3(0, 2, 0), out);
  assert.deepEqual({ x: out.x, y: out.y, z: out.z }, { x: 1, y: 2, z: 0 });
  scale(out, 3, out);
  assert.deepEqual({ x: out.x, y: out.y, z: out.z }, { x: 3, y: 6, z: 0 });
});

test('length: norme euclidienne (3,4,0) = 5', () => {
  assert.ok(Math.abs(length(makeVec3(3, 4, 0)) - 5) < EPS);
  assert.equal(lengthSq(makeVec3(3, 4, 0)), 25);
});

test('dot: orthogonalité → 0', () => {
  assert.ok(Math.abs(dot(makeVec3(1, 0, 0), makeVec3(0, 1, 0))) < EPS);
});

test('angleBetween: vecteurs colinéaires même sens → 0', () => {
  const ang = angleBetween(makeVec3(2, 0, 0), makeVec3(5, 0, 0));
  assert.ok(Math.abs(ang) < EPS);
});

test('angleBetween: opposés → π', () => {
  const ang = angleBetween(makeVec3(1, 0, 0), makeVec3(-1, 0, 0));
  assert.ok(Math.abs(ang - Math.PI) < 1e-9);
});

test('angleBetween: orthogonaux → π/2', () => {
  const ang = angleBetween(makeVec3(1, 0, 0), makeVec3(0, 1, 0));
  assert.ok(Math.abs(ang - Math.PI / 2) < 1e-9);
});

test('angleBetween: vecteur nul → 0 (pas NaN)', () => {
  assert.equal(angleBetween(makeVec3(0, 0, 0), makeVec3(1, 0, 0)), 0);
});
