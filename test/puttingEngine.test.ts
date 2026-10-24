import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultPuttingEngine,
  INITIAL_TARGET_ZONE_DIAMETER_CM,
  REGULATION_HOLE_DIAMETER_CM,
  type Vector2,
} from "../src/puttingEngine.ts";

const POSITION_TOLERANCE_CM = 1e-9;

function assertVectorApproximatelyEqual(
  actual: Vector2,
  expected: Vector2,
): void {
  assert.ok(Math.abs(actual.x - expected.x) <= POSITION_TOLERANCE_CM);
  assert.ok(Math.abs(actual.y - expected.y) <= POSITION_TOLERANCE_CM);
}

function aimForEndpointOffset(
  travelDistanceCm: number,
  offsetFromTargetCm: number,
  side: "left" | "right",
): Vector2 {
  const angleRadians = 2 * Math.asin(offsetFromTargetCm / (2 * travelDistanceCm));
  const lateralSign = side === "left" ? -1 : 1;
  return {
    x: lateralSign * Math.sin(angleRadians),
    y: Math.cos(angleRadians),
  };
}

test("directly aligned aim ends at the fixed target", () => {
  const engine = createDefaultPuttingEngine();

  const outcome = engine.simulatePutt();

  assertVectorApproximatelyEqual(outcome.endpoint, engine.target);
  assert.equal(outcome.classification, "On Target");
  assert.equal(outcome.isWithinTargetZone, true);
  assert.equal(outcome.isWithinRegulationHole, true);
});

test("deliberate left deviation is classified as Missed Left", () => {
  const engine = createDefaultPuttingEngine();
  engine.setAimDirection({ x: -0.2, y: 1 });

  assert.equal(engine.simulatePutt().classification, "Missed Left");
});

test("deliberate right deviation is classified as Missed Right", () => {
  const engine = createDefaultPuttingEngine();
  engine.setAimDirection({ x: 0.2, y: 1 });

  assert.equal(engine.simulatePutt().classification, "Missed Right");
});

test("the target-zone boundary is inclusive and uses the practice zone, not the hole", () => {
  const engine = createDefaultPuttingEngine();
  const targetZoneRadiusCm = INITIAL_TARGET_ZONE_DIAMETER_CM / 2;

  engine.setAimDirection(
    aimForEndpointOffset(engine.travelDistanceCm, targetZoneRadiusCm, "right"),
  );
  const boundaryOutcome = engine.simulatePutt();
  assert.equal(boundaryOutcome.classification, "On Target");
  assert.equal(boundaryOutcome.isWithinRegulationHole, false);

  engine.setAimDirection(
    aimForEndpointOffset(
      engine.travelDistanceCm,
      targetZoneRadiusCm + 0.01,
      "right",
    ),
  );
  assert.equal(engine.simulatePutt().classification, "Missed Right");

  assert.ok(targetZoneRadiusCm > REGULATION_HOLE_DIAMETER_CM / 2);
});

test("identical state produces an identical endpoint and result", () => {
  const engine = createDefaultPuttingEngine();
  engine.setAimDirection({ x: -0.125, y: 1 });

  const firstOutcome = engine.simulatePutt();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.deepEqual(engine.simulatePutt(), firstOutcome);
  }
});

test("resetAim restores the default direction", () => {
  const engine = createDefaultPuttingEngine();
  const defaultDirection = engine.aimDirection;
  engine.setAimDirection({ x: 0.3, y: 1 });

  engine.resetAim();

  assertVectorApproximatelyEqual(engine.aimDirection, defaultDirection);
  assert.equal(engine.simulatePutt().classification, "On Target");
});
