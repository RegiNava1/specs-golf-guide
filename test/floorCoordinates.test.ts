import assert from "node:assert/strict";
import test from "node:test";
import {
  floorDirection,
  floorPoint,
  setupLocalPoint,
  validateFloorBasis,
  type FloorBasis,
} from "../src/floorCoordinates.ts";

const basis: FloorBasis = {
  origin: { x: 10, y: -40, z: 20 },
  right: { x: 1, y: 0, z: 0 },
  forward: { x: 0, y: 0, z: -1 },
};

test("maps logic centimeters into rotated world floor coordinates", () => {
  assert.deepEqual(floorPoint({ x: 20, y: 150 }, basis), { x: 30, y: -40, z: -130 });
});

test("preserves the setup's floor elevation and real scale", () => {
  const a = floorPoint({ x: 0, y: 0 }, basis);
  const b = floorPoint({ x: 0, y: 150 }, basis);
  assert.equal(a.y, b.y);
  assert.equal(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), 150);
});

test("maps aim direction without including origin translation", () => {
  assert.deepEqual(floorDirection({ x: 0, y: 5 }, basis), { x: 0, y: 0, z: -1 });
  const side = floorDirection({ x: 3, y: 4 }, basis);
  assert.equal(Math.hypot(side.x, side.y, side.z), 1);
  assert.deepEqual(side, { x: 0.6, y: 0, z: -0.8 });
});

test("placement offset is subtracted once for setup-local child positions", () => {
  assert.deepEqual(setupLocalPoint({ x: 35, y: 130 }, { x: 35, y: -20 }), { x: 0, y: 150 });
});

test("rejects invalid basis and zero or non-finite directions", () => {
  assert.throws(() => validateFloorBasis({ ...basis, forward: { x: 1, y: 0, z: 0 } }));
  assert.throws(() => validateFloorBasis({ ...basis, right: { x: 2, y: 0, z: 0 } }));
  assert.throws(() => floorDirection({ x: 0, y: 0 }, basis));
  assert.throws(() => floorPoint({ x: Number.NaN, y: 1 }, basis));
});
