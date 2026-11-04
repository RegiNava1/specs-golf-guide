import assert from "node:assert/strict";
import test from "node:test";

import {
  VirtualStrokeInputAdapter,
  type CapturedVirtualStroke,
} from "../src/strokeInputAdapter.ts";
import {createDefaultStrokeModel} from "../src/strokeSimulation.ts";
import type {Vector2} from "../src/puttingEngine.ts";

function createAdapter(): VirtualStrokeInputAdapter {
  return new VirtualStrokeInputAdapter(createDefaultStrokeModel());
}

function completeGesture(
  adapter: VirtualStrokeInputAdapter,
  backswing: Vector2,
  impact: Vector2,
): CapturedVirtualStroke {
  assert.equal(adapter.addressBall({x: 0, y: 0}), true);
  assert.equal(adapter.startBackswing(), true);
  assert.equal(adapter.trackBackswing(backswing), true);
  assert.equal(
    adapter.startForwardStroke({
      x: backswing.x * 0.75,
      y: backswing.y * 0.75,
    }),
    true,
  );
  assert.equal(adapter.trackForwardStroke({x: impact.x / 2, y: impact.y - 1}), true);
  const capture = adapter.completeStroke(impact);
  assert.notEqual(capture, null);
  return capture as CapturedVirtualStroke;
}

test("a complete back-and-forward gesture captures one deterministic stroke", () => {
  const adapter = createAdapter();
  const capture = completeGesture(adapter, {x: 0, y: -30}, {x: 0, y: 0});

  assert.equal(adapter.phase, "impacted");
  assert.deepEqual(capture.direction, {x: 0, y: 1});
  assert.equal(capture.strength, 1);
  assert.deepEqual(capture.outcome.endpoint, {x: 0, y: 150});
  assert.equal(capture.outcome.puttingOutcome.classification, "On Target");
});

test("backswing-to-impact displacement maps weak and strong gestures to strength", () => {
  const weak = completeGesture(createAdapter(), {x: 0, y: -15}, {x: 0, y: 0});
  const strong = completeGesture(createAdapter(), {x: 0, y: -45}, {x: 0, y: 0});

  assert.equal(weak.strength, 0.5);
  assert.equal(weak.outcome.distanceFeedback, "Short");
  assert.equal(strong.strength, 1.5);
  assert.equal(strong.outcome.distanceFeedback, "Long");
});

test("the actual forward path, rather than selected aim alone, determines direction", () => {
  const left = completeGesture(createAdapter(), {x: 0, y: -30}, {x: -6, y: 0});
  const right = completeGesture(createAdapter(), {x: 0, y: -30}, {x: 6, y: 0});

  assert.ok(left.direction.x < 0);
  assert.equal(left.outcome.aimDeviation, "Left of Aim");
  assert.equal(left.outcome.puttingOutcome.classification, "Missed Left");
  assert.ok(right.direction.x > 0);
  assert.equal(right.outcome.aimDeviation, "Right of Aim");
  assert.equal(right.outcome.puttingOutcome.classification, "Missed Right");
});

test("an active backswing can be cancelled and cannot produce an impact", () => {
  const adapter = createAdapter();
  assert.equal(adapter.addressBall({x: 0, y: 0}), true);
  assert.equal(adapter.startBackswing(), true);
  assert.equal(adapter.trackBackswing({x: 0, y: -20}), true);

  assert.equal(adapter.cancelStroke(), true);
  assert.equal(adapter.phase, "cancelled");
  assert.equal(adapter.completeStroke({x: 0, y: 0}), null);
  assert.equal(adapter.lastCapturedStroke, null);
});

test("an incomplete forward stroke that never reaches the ball plane is rejected", () => {
  const adapter = createAdapter();
  assert.equal(adapter.addressBall({x: 0, y: 0}), true);
  assert.equal(adapter.startBackswing(), true);
  assert.equal(adapter.trackBackswing({x: 0, y: -30}), true);
  assert.equal(adapter.startForwardStroke({x: 0, y: -20}), true);

  assert.equal(adapter.completeStroke({x: 0, y: -5}), null);
  assert.equal(adapter.phase, "cancelled");
});

test("short or zero-length gestures and accidental releases are rejected", () => {
  const short = createAdapter();
  assert.equal(short.addressBall({x: 0, y: 0}), true);
  assert.equal(short.startBackswing(), true);
  assert.equal(short.trackBackswing({x: 0, y: -2}), true);
  assert.equal(short.startForwardStroke({x: 0, y: 0}), false);
  assert.equal(short.phase, "cancelled");

  const released = createAdapter();
  assert.equal(released.addressBall({x: 0, y: 0}), true);
  assert.equal(released.completeStroke({x: 0, y: 0}), null);
  assert.equal(released.phase, "cancelled");
});

test("invalid vectors cancel active capture without reaching the stroke model", () => {
  const adapter = createAdapter();
  assert.equal(adapter.addressBall({x: Number.NaN, y: 0}), false);
  assert.equal(adapter.phase, "idle");
  assert.equal(adapter.addressBall({x: 0, y: 0}), true);
  assert.equal(adapter.startBackswing(), true);

  assert.equal(adapter.trackBackswing({x: 0, y: Number.POSITIVE_INFINITY}), false);
  assert.equal(adapter.phase, "cancelled");
  assert.equal(adapter.lastCapturedStroke, null);
});

test("one gesture cannot execute duplicate impacts", () => {
  const adapter = createAdapter();
  const first = completeGesture(adapter, {x: 0, y: -30}, {x: 0, y: 0});

  assert.equal(adapter.completeStroke({x: 8, y: 0}), null);
  assert.equal(adapter.phase, "impacted");
  assert.deepEqual(adapter.lastCapturedStroke, first);
});

test("reset clears all transient input for retry and repeated practice", () => {
  const adapter = createAdapter();
  const first = completeGesture(adapter, {x: -2, y: -30}, {x: 3, y: 0});

  adapter.resetInput();
  assert.deepEqual(adapter.getSnapshot(), {
    phase: "idle",
    addressedPoint: null,
    farthestBackswingPoint: null,
    currentPoint: null,
    capturedStroke: null,
  });
  const second = completeGesture(adapter, {x: -2, y: -30}, {x: 3, y: 0});
  assert.deepEqual(second, first);
});

test("captured input exactly matches direct deterministic-model execution", () => {
  const model = createDefaultStrokeModel();
  const adapter = new VirtualStrokeInputAdapter(model);
  const capture = completeGesture(adapter, {x: 2, y: -24}, {x: -4, y: 0});

  assert.deepEqual(
    capture.outcome,
    model.simulateStroke({
      direction: capture.direction,
      strength: capture.strength,
    }),
  );
});

test("addressing is limited to the virtual ball and does not accept camera input", () => {
  const adapter = createAdapter();

  assert.equal(adapter.addressBall({x: 7, y: 0}), false);
  assert.equal(adapter.phase, "idle");
  assert.equal(adapter.addressBall({x: 6, y: 0}), true);
  assert.equal(adapter.phase, "addressed");
});
