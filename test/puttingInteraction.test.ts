import assert from "node:assert/strict";
import test from "node:test";

import {
  createPuttingInteraction,
  transitionPuttingInteraction,
  type PuttingInteractionAction,
  type PuttingInteractionState,
} from "../src/puttingInteraction.ts";

function dispatch(
  state: PuttingInteractionState,
  action: PuttingInteractionAction,
): PuttingInteractionState {
  return transitionPuttingInteraction(state, action);
}

function aimingInteraction(): PuttingInteractionState {
  return dispatch(createPuttingInteraction(), { type: "CONFIRM_PLACEMENT" });
}

test("placement interaction requires activation and moves the whole setup", () => {
  const initial = createPuttingInteraction();
  assert.strictEqual(
    dispatch(initial, {
      type: "MOVE_PLACEMENT_HANDLE",
      placementOffset: { x: 30, y: -10 },
    }),
    initial,
  );

  let state = dispatch(initial, { type: "ACTIVATE_MOVE_SETUP" });
  assert.equal(state.mode, "moving-setup");
  state = dispatch(state, {
    type: "MOVE_PLACEMENT_HANDLE",
    placementOffset: { x: 30, y: -10 },
  });
  assert.equal(state.session.phase, "moving-setup");
  assert.deepEqual(state.session.startingBallPosition, { x: 30, y: -10 });
  assert.deepEqual(state.session.targetPosition, { x: 30, y: 140 });

  state = dispatch(state, { type: "CONFIRM_PLACEMENT" });
  assert.equal(state.mode, "idle");
  assert.equal(state.session.phase, "aiming");
});

test("aim interaction requires activation and keeps the target fixed", () => {
  const aiming = aimingInteraction();
  const target = aiming.session.targetPosition;
  assert.strictEqual(
    dispatch(aiming, {
      type: "MOVE_AIMING_HANDLE",
      direction: { x: -0.2, y: 1 },
    }),
    aiming,
  );

  let state = dispatch(aiming, { type: "ACTIVATE_ADJUST_AIM" });
  state = dispatch(state, {
    type: "MOVE_AIMING_HANDLE",
    direction: { x: -0.2, y: 1 },
  });

  assert.equal(state.mode, "adjusting-aim");
  assert.notDeepEqual(state.session.aimDirection, aiming.session.aimDirection);
  assert.deepEqual(state.session.targetPosition, target);
});

test("invalid actions and vectors are ignored without corrupting state", () => {
  const initial = createPuttingInteraction();
  assert.strictEqual(dispatch(initial, { type: "PRACTICE_PUTT" }), initial);
  assert.strictEqual(dispatch(initial, { type: "COMPLETE_ROLL" }), initial);
  assert.strictEqual(dispatch(initial, { type: "TRY_AGAIN" }), initial);

  let state = dispatch(initial, { type: "ACTIVATE_MOVE_SETUP" });
  assert.strictEqual(
    dispatch(state, { type: "ACTIVATE_ADJUST_AIM" }),
    state,
  );
  assert.strictEqual(
    dispatch(state, {
      type: "MOVE_PLACEMENT_HANDLE",
      placementOffset: { x: Number.NaN, y: 0 },
    }),
    state,
  );

  state = dispatch(aimingInteraction(), { type: "ACTIVATE_ADJUST_AIM" });
  assert.strictEqual(dispatch(state, { type: "COMPLETE_ROLL" }), state);
  assert.strictEqual(dispatch(state, { type: "TRY_AGAIN" }), state);
  assert.strictEqual(
    dispatch(state, {
      type: "MOVE_AIMING_HANDLE",
      direction: { x: 0, y: 0 },
    }),
    state,
  );
});

test("double activation is ignored", () => {
  const moving = dispatch(createPuttingInteraction(), {
    type: "ACTIVATE_MOVE_SETUP",
  });
  assert.strictEqual(
    dispatch(moving, { type: "ACTIVATE_MOVE_SETUP" }),
    moving,
  );

  const adjusting = dispatch(aimingInteraction(), {
    type: "ACTIVATE_ADJUST_AIM",
  });
  assert.strictEqual(
    dispatch(adjusting, { type: "ACTIVATE_ADJUST_AIM" }),
    adjusting,
  );
});

test("rolling completion happens once and exposes the calculated result", () => {
  let state = dispatch(aimingInteraction(), { type: "PRACTICE_PUTT" });
  assert.equal(state.mode, "idle");
  assert.equal(state.session.phase, "rolling");

  state = dispatch(state, { type: "COMPLETE_ROLL" });
  assert.equal(state.session.phase, "result");
  assert.deepEqual(state.session.ballPosition, state.session.puttEndpoint);
  assert.equal(state.session.outcome?.classification, "On Target");
  assert.strictEqual(dispatch(state, { type: "COMPLETE_ROLL" }), state);
});

test("retry preserves placement and aim while resetting transient mode", () => {
  let state = dispatch(createPuttingInteraction(), {
    type: "ACTIVATE_MOVE_SETUP",
  });
  state = dispatch(state, {
    type: "MOVE_PLACEMENT_HANDLE",
    placementOffset: { x: 25, y: 5 },
  });
  state = dispatch(state, { type: "CONFIRM_PLACEMENT" });
  state = dispatch(state, { type: "ACTIVATE_ADJUST_AIM" });
  state = dispatch(state, {
    type: "MOVE_AIMING_HANDLE",
    direction: { x: 0.2, y: 1 },
  });
  const placement = state.session.placementOffset;
  const aim = state.session.aimDirection;
  state = dispatch(state, { type: "PRACTICE_PUTT" });
  state = dispatch(state, { type: "COMPLETE_ROLL" });
  state = dispatch(state, { type: "TRY_AGAIN" });

  assert.equal(state.mode, "idle");
  assert.equal(state.session.phase, "aiming");
  assert.deepEqual(state.session.placementOffset, placement);
  assert.deepEqual(state.session.aimDirection, aim);
  assert.deepEqual(
    state.session.ballPosition,
    state.session.startingBallPosition,
  );
});

test("reset restores session defaults and clears transient mode", () => {
  let state = dispatch(aimingInteraction(), { type: "ACTIVATE_ADJUST_AIM" });
  state = dispatch(state, {
    type: "MOVE_AIMING_HANDLE",
    direction: { x: 0.2, y: 1 },
  });
  state = dispatch(state, { type: "RESET_SETUP" });

  assert.deepEqual(state, createPuttingInteraction());
});

test("multiple interaction cycles are deterministic and do not leak state", () => {
  let state = aimingInteraction();

  for (const direction of [
    { x: -0.2, y: 1 },
    { x: 0.2, y: 1 },
    { x: 0, y: 1 },
  ]) {
    state = dispatch(state, { type: "ACTIVATE_ADJUST_AIM" });
    state = dispatch(state, {
      type: "MOVE_AIMING_HANDLE",
      direction,
    });
    state = dispatch(state, { type: "PRACTICE_PUTT" });
    state = dispatch(state, { type: "COMPLETE_ROLL" });
    assert.equal(state.session.phase, "result");
    assert.notEqual(state.session.outcome, null);
    state = dispatch(state, { type: "TRY_AGAIN" });
    assert.equal(state.mode, "idle");
    assert.equal(state.session.phase, "aiming");
    assert.equal(state.session.outcome, null);
    assert.equal(state.session.puttEndpoint, null);
  }
});
