import assert from "node:assert/strict";
import test from "node:test";

import { DeterministicPuttingEngine } from "../src/puttingEngine.ts";
import {
  createPuttingSession,
  DEFAULT_BALL_POSITION,
  DEFAULT_TARGET_POSITION,
  transitionPuttingSession,
  type PuttingSessionAction,
  type PuttingSessionState,
} from "../src/puttingSession.ts";

function dispatch(
  state: PuttingSessionState,
  action: PuttingSessionAction,
): PuttingSessionState {
  return transitionPuttingSession(state, action);
}

function confirmedSession(): PuttingSessionState {
  return dispatch(createPuttingSession(), { type: "CONFIRM_PLACEMENT" });
}

test("initial session uses the approved default arrangement", () => {
  const state = createPuttingSession();

  assert.equal(state.phase, "initial-placement");
  assert.deepEqual(state.placementOffset, { x: 0, y: 0 });
  assert.deepEqual(state.startingBallPosition, DEFAULT_BALL_POSITION);
  assert.deepEqual(state.targetPosition, DEFAULT_TARGET_POSITION);
  assert.deepEqual(state.aimDirection, { x: 0, y: 1 });
  assert.deepEqual(state.ballPosition, DEFAULT_BALL_POSITION);
  assert.equal(state.puttEndpoint, null);
  assert.equal(state.outcome, null);
});

test("Move Setup translates the whole arrangement without changing its layout", () => {
  const initial = createPuttingSession();
  const moved = dispatch(initial, {
    type: "MOVE_SETUP",
    placementOffset: { x: 35, y: -20 },
  });

  assert.equal(moved.phase, "moving-setup");
  assert.deepEqual(moved.startingBallPosition, { x: 35, y: -20 });
  assert.deepEqual(moved.targetPosition, { x: 35, y: 130 });
  assert.deepEqual(
    {
      x: moved.targetPosition.x - moved.startingBallPosition.x,
      y: moved.targetPosition.y - moved.startingBallPosition.y,
    },
    {
      x: initial.targetPosition.x - initial.startingBallPosition.x,
      y: initial.targetPosition.y - initial.startingBallPosition.y,
    },
  );
});

test("Confirm Placement transitions to aiming", () => {
  const moving = dispatch(createPuttingSession(), {
    type: "MOVE_SETUP",
    placementOffset: { x: 10, y: 15 },
  });

  const confirmed = dispatch(moving, { type: "CONFIRM_PLACEMENT" });

  assert.equal(confirmed.phase, "aiming");
  assert.deepEqual(confirmed.placementOffset, moving.placementOffset);
});

test("Adjust Aim changes direction without moving the fixed target", () => {
  const confirmed = confirmedSession();
  const targetBefore = confirmed.targetPosition;

  const adjusted = dispatch(confirmed, {
    type: "ADJUST_AIM",
    direction: { x: -0.2, y: 1 },
  });

  assert.notDeepEqual(adjusted.aimDirection, confirmed.aimDirection);
  assert.deepEqual(adjusted.targetPosition, targetBefore);
  assert.equal(adjusted.phase, "aiming");
});

test("Practice Putt calculates the existing engine's deterministic endpoint", () => {
  let state = confirmedSession();
  state = dispatch(state, {
    type: "ADJUST_AIM",
    direction: { x: 0.2, y: 1 },
  });

  const engine = new DeterministicPuttingEngine({
    ball: state.startingBallPosition,
    target: state.targetPosition,
  });
  engine.setAimDirection(state.aimDirection);
  const expected = engine.simulatePutt();

  const rolling = dispatch(state, { type: "PRACTICE_PUTT" });

  assert.equal(rolling.phase, "rolling");
  assert.deepEqual(rolling.puttEndpoint, expected.endpoint);
  assert.deepEqual(rolling.outcome, expected);
  assert.deepEqual(rolling.ballPosition, rolling.startingBallPosition);
});

test("rolling and completed result remain distinct phases", () => {
  const rolling = dispatch(confirmedSession(), { type: "PRACTICE_PUTT" });

  assert.equal(rolling.phase, "rolling");
  assert.deepEqual(rolling.ballPosition, rolling.startingBallPosition);
  assert.notEqual(rolling.outcome, null);

  const result = dispatch(rolling, { type: "COMPLETE_ROLL" });
  assert.equal(result.phase, "result");
  assert.deepEqual(result.ballPosition, result.puttEndpoint);
  assert.equal(result.outcome?.classification, "On Target");
});

test("Try Again preserves aim and placement while restoring the ball", () => {
  let state = createPuttingSession();
  state = dispatch(state, {
    type: "MOVE_SETUP",
    placementOffset: { x: 25, y: 10 },
  });
  state = dispatch(state, { type: "CONFIRM_PLACEMENT" });
  state = dispatch(state, {
    type: "ADJUST_AIM",
    direction: { x: -0.2, y: 1 },
  });
  const preservedAim = state.aimDirection;
  const preservedOffset = state.placementOffset;
  state = dispatch(state, { type: "PRACTICE_PUTT" });
  state = dispatch(state, { type: "COMPLETE_ROLL" });

  const retry = dispatch(state, { type: "TRY_AGAIN" });

  assert.equal(retry.phase, "aiming");
  assert.deepEqual(retry.aimDirection, preservedAim);
  assert.deepEqual(retry.placementOffset, preservedOffset);
  assert.deepEqual(retry.ballPosition, retry.startingBallPosition);
  assert.equal(retry.puttEndpoint, null);
  assert.equal(retry.outcome, null);
});

test("Reset Setup restores the original arrangement and default aim", () => {
  let state = createPuttingSession();
  state = dispatch(state, {
    type: "MOVE_SETUP",
    placementOffset: { x: 40, y: 30 },
  });
  state = dispatch(state, { type: "CONFIRM_PLACEMENT" });
  state = dispatch(state, {
    type: "ADJUST_AIM",
    direction: { x: 0.25, y: 1 },
  });
  state = dispatch(state, { type: "PRACTICE_PUTT" });

  const reset = dispatch(state, { type: "RESET_SETUP" });

  assert.deepEqual(reset, createPuttingSession());
});

test("invalid actions and malformed vectors are safely ignored", () => {
  const initial = createPuttingSession();
  assert.strictEqual(
    dispatch(initial, { type: "PRACTICE_PUTT" }),
    initial,
  );
  assert.strictEqual(
    dispatch(initial, { type: "TRY_AGAIN" }),
    initial,
  );
  assert.strictEqual(
    dispatch(initial, {
      type: "MOVE_SETUP",
      placementOffset: { x: Number.NaN, y: 0 },
    }),
    initial,
  );

  const aiming = confirmedSession();
  assert.strictEqual(
    dispatch(aiming, {
      type: "ADJUST_AIM",
      direction: { x: 0, y: 0 },
    }),
    aiming,
  );
  assert.strictEqual(
    dispatch(aiming, { type: "COMPLETE_ROLL" }),
    aiming,
  );
});

test("multiple complete cycles do not leak prior results", () => {
  let state = confirmedSession();
  state = dispatch(state, {
    type: "ADJUST_AIM",
    direction: { x: -0.2, y: 1 },
  });
  state = dispatch(state, { type: "PRACTICE_PUTT" });
  state = dispatch(state, { type: "COMPLETE_ROLL" });
  assert.equal(state.outcome?.classification, "Missed Left");

  state = dispatch(state, { type: "TRY_AGAIN" });
  assert.equal(state.outcome, null);
  state = dispatch(state, {
    type: "ADJUST_AIM",
    direction: { x: 0.2, y: 1 },
  });
  state = dispatch(state, { type: "PRACTICE_PUTT" });
  state = dispatch(state, { type: "COMPLETE_ROLL" });
  assert.equal(state.outcome?.classification, "Missed Right");

  state = dispatch(state, { type: "TRY_AGAIN" });
  assert.equal(state.phase, "aiming");
  assert.equal(state.outcome, null);
  assert.equal(state.puttEndpoint, null);
});
