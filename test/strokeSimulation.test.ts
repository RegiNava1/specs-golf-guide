import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultStrokeModel,
  DeterministicStrokeModel,
} from "../src/strokeSimulation.ts";
import {
  createDefaultPuttingEngine,
  INITIAL_TARGET_ZONE_DIAMETER_CM,
} from "../src/puttingEngine.ts";

const POSITION_TOLERANCE_CM = 1e-9;

function assertApproximatelyEqual(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= POSITION_TOLERANCE_CM);
}

test("an aligned unit-strength stroke reaches the fixed target", () => {
  const model = createDefaultStrokeModel();

  const outcome = model.simulateStroke({
    direction: {x: 0, y: 1},
    strength: 1,
  });

  assert.deepEqual(outcome.endpoint, {x: 0, y: 150});
  assert.equal(outcome.travelDistanceCm, 150);
  assert.equal(outcome.aimDeviation, "Aligned");
  assert.equal(outcome.distanceFeedback, "On Distance");
  assert.equal(outcome.puttingOutcome.classification, "On Target");
  assert.equal(outcome.puttingOutcome.isWithinTargetZone, true);
});

test("weak and strong strokes report short and long without changing the three-label contract", () => {
  const model = createDefaultStrokeModel();

  const weak = model.simulateStroke({direction: {x: 0, y: 1}, strength: 0.5});
  const strong = model.simulateStroke({direction: {x: 0, y: 1}, strength: 1.5});

  assert.deepEqual(weak.endpoint, {x: 0, y: 75});
  assert.equal(weak.distanceFeedback, "Short");
  assert.equal(weak.puttingOutcome.isWithinTargetZone, false);
  assert.deepEqual(strong.endpoint, {x: 0, y: 225});
  assert.equal(strong.distanceFeedback, "Long");
  assert.equal(strong.puttingOutcome.isWithinTargetZone, false);
  assert.match(weak.puttingOutcome.classification, /^(On Target|Missed Left|Missed Right)$/);
  assert.match(strong.puttingOutcome.classification, /^(On Target|Missed Left|Missed Right)$/);
});

test("deliberate path deviations are measured against the selected aim", () => {
  const model = createDefaultStrokeModel();

  const left = model.simulateStroke({direction: {x: -0.2, y: 1}, strength: 1});
  const right = model.simulateStroke({direction: {x: 0.2, y: 1}, strength: 1});

  assert.equal(left.aimDeviation, "Left of Aim");
  assert.equal(left.puttingOutcome.classification, "Missed Left");
  assert.equal(right.aimDeviation, "Right of Aim");
  assert.equal(right.puttingOutcome.classification, "Missed Right");
});

test("selected aim and fixed-target comparisons remain separate", () => {
  const model = createDefaultStrokeModel({x: 0.2, y: 1});

  const outcome = model.simulateStroke({direction: {x: 0, y: 1}, strength: 1});

  assert.equal(outcome.aimDeviation, "Left of Aim");
  assert.equal(outcome.puttingOutcome.classification, "On Target");
});

test("the inclusive 22.5 cm target-zone boundary also counts as on distance", () => {
  const model = createDefaultStrokeModel();
  const radiusCm = INITIAL_TARGET_ZONE_DIAMETER_CM / 2;

  const boundary = model.simulateStroke({
    direction: {x: 0, y: 1},
    strength: (150 - radiusCm) / 150,
  });
  const outside = model.simulateStroke({
    direction: {x: 0, y: 1},
    strength: (150 - radiusCm - 0.01) / 150,
  });

  assert.equal(boundary.distanceFeedback, "On Distance");
  assert.equal(boundary.puttingOutcome.classification, "On Target");
  assert.equal(outside.distanceFeedback, "Short");
  assert.equal(outside.puttingOutcome.isWithinTargetZone, false);
});

test("zero strength is a deterministic no-travel stroke", () => {
  const model = createDefaultStrokeModel();

  const outcome = model.simulateStroke({direction: {x: 0, y: 1}, strength: 0});

  assert.deepEqual(outcome.endpoint, {x: 0, y: 0});
  assert.equal(outcome.travelDistanceCm, 0);
  assert.equal(outcome.distanceFeedback, "Short");
});

test("invalid direction and strength inputs are rejected", () => {
  const model = createDefaultStrokeModel();

  assert.throws(
    () => model.simulateStroke({direction: {x: 0, y: 0}, strength: 1}),
    /zero-length/,
  );
  assert.throws(
    () => model.simulateStroke({direction: {x: Number.NaN, y: 1}, strength: 1}),
    /finite coordinates/,
  );
  assert.throws(
    () => model.simulateStroke({direction: {x: 0, y: 1}, strength: -0.1}),
    /greater than or equal to zero/,
  );
  assert.throws(
    () => model.simulateStroke({direction: {x: 0, y: 1}, strength: Number.POSITIVE_INFINITY}),
    /finite number/,
  );
});

test("identical stroke inputs are repeatable", () => {
  const model = createDefaultStrokeModel({x: -0.05, y: 1});
  const input = {direction: {x: 0.125, y: 1}, strength: 0.82};
  const first = model.simulateStroke(input);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.deepEqual(model.simulateStroke(input), first);
  }
});

test("unit-strength selected aim stays compatible with the putting engine", () => {
  const selectedAim = {x: -0.125, y: 1};
  const strokeModel = new DeterministicStrokeModel({
    ball: {x: 0, y: 0},
    target: {x: 0, y: 150},
    selectedAimDirection: selectedAim,
  });
  const puttingEngine = createDefaultPuttingEngine();
  puttingEngine.setAimDirection(selectedAim);

  const stroke = strokeModel.simulateStroke({direction: selectedAim, strength: 1});
  const putt = puttingEngine.simulatePutt();

  assertApproximatelyEqual(stroke.endpoint.x, putt.endpoint.x);
  assertApproximatelyEqual(stroke.endpoint.y, putt.endpoint.y);
  assert.deepEqual(stroke.puttingOutcome, putt);
});
