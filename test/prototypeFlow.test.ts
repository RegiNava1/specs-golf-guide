import assert from "node:assert/strict";
import test from "node:test";
import { logicPointToPreviewPlane, PuttingPrototypeController } from "../src/prototypeController.ts";

function finishPutt(controller: PuttingPrototypeController): void {
  assert.equal(controller.practicePutt(1_000), true);
  const midpoint = controller.tick(1_750);
  assert.equal(midpoint?.progress, 0.5);
  assert.equal(controller.state.session.phase, "rolling");
  const completed = controller.tick(2_500);
  assert.equal(completed?.complete, true);
  assert.equal(controller.state.session.phase, "result");
  assert.deepEqual(controller.displayedBallPosition, controller.state.session.puttEndpoint);
}

test("runs placement, direct putt, left/right retries, reset, and repeat", () => {
  const controller = new PuttingPrototypeController();
  assert.equal(controller.activateMoveSetup(), true);
  assert.equal(controller.moveSetup({ x: 20, y: -10 }), true);
  assert.deepEqual(controller.state.session.startingBallPosition, { x: 20, y: -10 });
  assert.deepEqual(controller.state.session.targetPosition, { x: 20, y: 140 });
  assert.equal(controller.confirmPlacement(), true);

  assert.equal(controller.activateAdjustAim(), true);
  assert.equal(controller.adjustAim({ x: 0, y: 1 }), true);
  finishPutt(controller);
  assert.equal(controller.state.session.outcome?.classification, "On Target");

  assert.equal(controller.tryAgain(), true);
  assert.equal(controller.activateAdjustAim(), true);
  assert.equal(controller.adjustAim({ x: -0.2, y: 1 }), true);
  finishPutt(controller);
  assert.equal(controller.state.session.outcome?.classification, "Missed Left");

  assert.equal(controller.tryAgain(), true);
  assert.equal(controller.activateAdjustAim(), true);
  assert.equal(controller.adjustAim({ x: 0.2, y: 1 }), true);
  finishPutt(controller);
  assert.equal(controller.state.session.outcome?.classification, "Missed Right");

  assert.equal(controller.resetSetup(), true);
  assert.equal(controller.state.session.phase, "initial-placement");
  assert.deepEqual(controller.state.session.placementOffset, { x: 0, y: 0 });
  assert.deepEqual(controller.state.session.aimDirection, { x: 0, y: 1 });
  assert.equal(controller.confirmPlacement(), true);
  finishPutt(controller);
  assert.equal(controller.state.session.outcome?.classification, "On Target");
});

test("invalid prototype interactions leave state and visuals uncorrupted", () => {
  const controller = new PuttingPrototypeController();
  const initialState = controller.state;
  const initialBall = controller.displayedBallPosition;
  assert.equal(controller.practicePutt(0), false);
  assert.equal(controller.adjustAim({ x: 0, y: 0 }), false);
  assert.equal(controller.tick(Number.NaN), null);
  assert.strictEqual(controller.state, initialState);
  assert.deepEqual(controller.displayedBallPosition, initialBall);
  assert.equal(controller.activateMoveSetup(), true);
  const movingState = controller.state;
  assert.equal(controller.moveSetup({ x: Number.NaN, y: 0 }), false);
  assert.strictEqual(controller.state, movingState);
  assert.deepEqual(controller.displayedBallPosition, initialBall);
});

test("top-down preview uses the existing floor-coordinate adapter at true scale", () => {
  assert.deepEqual(logicPointToPreviewPlane({ x: 20, y: 150 }), { x: 20, y: 150 });
});
