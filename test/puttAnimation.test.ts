import assert from "node:assert/strict";
import test from "node:test";
import { samplePuttRoll, PUTT_ROLL_DURATION_SECONDS } from "../src/puttAnimation.ts";

const start = { x: 25, y: -10 };
const endpoint = { x: 55, y: 140 };

test("fixed roll duration matches the approved 1.5 seconds", () => {
  assert.equal(PUTT_ROLL_DURATION_SECONDS, 1.5);
});

test("starts at the exact initial ball position with feedback still pending", () => {
  assert.deepEqual(samplePuttRoll(start, endpoint, 0), {
    position: start, progress: 0, complete: false,
  });
});

test("midpoint is linear interpolation at 0.75 seconds", () => {
  assert.deepEqual(samplePuttRoll(start, endpoint, 0.75), {
    position: { x: 40, y: 65 }, progress: 0.5, complete: false,
  });
});

test("elapsed time clamps safely before zero and after completion", () => {
  assert.deepEqual(samplePuttRoll(start, endpoint, -4).position, start);
  assert.deepEqual(samplePuttRoll(start, endpoint, 2), {
    position: endpoint, progress: 1, complete: true,
  });
});

test("same inputs always yield the same frame", () => {
  const expected = samplePuttRoll(start, endpoint, 0.37);
  for (let i = 0; i < 100; i += 1) {
    assert.deepEqual(samplePuttRoll(start, endpoint, 0.37), expected);
  }
});

test("invalid elapsed time or positions fail without producing NaN", () => {
  assert.throws(() => samplePuttRoll(start, endpoint, Number.NaN));
  assert.throws(() => samplePuttRoll({ x: Infinity, y: 0 }, endpoint, 0));
});
