import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyPuttEndpoint,
  PRACTICE_TARGET_ZONE_DIAMETER_CM,
} from "../lens-project/specs-golf-guide/Assets/GolfGuide/Scripts/GolfOutcome.ts";

const start = { x: 0, z: -80 };
const target = { x: 0, z: -230 };

test("classifies the aligned endpoint as On Target", () => {
  const result = classifyPuttEndpoint(target, target, start);
  assert.equal(result.classification, "On Target");
  assert.equal(result.distanceFromTargetCm, 0);
});

test("uses the practice zone instead of the smaller regulation hole", () => {
  const result = classifyPuttEndpoint({ x: 8, z: -230 }, target, start);
  assert.equal(result.classification, "On Target");
  assert.equal(result.isWithinTargetZone, true);
});

test("includes the 22.5 cm practice-zone boundary", () => {
  const result = classifyPuttEndpoint(
    { x: -(PRACTICE_TARGET_ZONE_DIAMETER_CM / 2), z: -230 },
    target,
    start,
  );
  assert.equal(result.classification, "On Target");
});

test("classifies a deliberate left endpoint", () => {
  const result = classifyPuttEndpoint({ x: -13.81, z: -229.36 }, target, start);
  assert.equal(result.classification, "Missed Left");
  assert.equal(result.isWithinTargetZone, false);
});

test("classifies a deliberate right endpoint", () => {
  const result = classifyPuttEndpoint({ x: 13.81, z: -229.36 }, target, start);
  assert.equal(result.classification, "Missed Right");
  assert.equal(result.isWithinTargetZone, false);
});
