import {
  createPuttingInteraction,
  transitionPuttingInteraction,
  type PuttingInteractionAction,
  type PuttingInteractionState,
} from "./puttingInteraction.ts";
import type { PuttingSetup, Vector2 } from "./puttingEngine.ts";
import { floorPoint, type FloorBasis } from "./floorCoordinates.ts";
import {
  samplePuttRoll,
  type RollFrame,
} from "./puttAnimation.ts";

const PREVIEW_FLOOR_BASIS: FloorBasis = {
  origin: { x: 0, y: 0, z: 0 },
  right: { x: 1, y: 0, z: 0 },
  forward: { x: 0, y: 0, z: -1 },
};

function copyVector(vector: Vector2): Vector2 {
  return { x: vector.x, y: vector.y };
}

/** Maps the shared centimeter logic plane to the local top-down preview plane. */
export function logicPointToPreviewPlane(point: Vector2): Vector2 {
  const worldPoint = floorPoint(point, PREVIEW_FLOOR_BASIS);
  return { x: worldPoint.x, y: -worldPoint.z };
}

/**
 * Thin local-only coordinator for the browser prototype. Product decisions stay
 * in the existing interaction reducer and pure roll sampler.
 */
export class PuttingPrototypeController {
  private interaction: PuttingInteractionState;
  private displayedBall: Vector2;
  private rollStartedAtMs: number | null = null;

  constructor(setup?: PuttingSetup) {
    this.interaction = createPuttingInteraction(setup);
    this.displayedBall = copyVector(this.interaction.session.ballPosition);
  }

  get state(): PuttingInteractionState {
    return this.interaction;
  }

  get displayedBallPosition(): Vector2 {
    return copyVector(this.displayedBall);
  }

  private dispatch(action: PuttingInteractionAction): boolean {
    const next = transitionPuttingInteraction(this.interaction, action);
    if (next === this.interaction) {
      return false;
    }
    this.interaction = next;
    return true;
  }

  activateMoveSetup(): boolean {
    return this.dispatch({ type: "ACTIVATE_MOVE_SETUP" });
  }

  moveSetup(placementOffset: Vector2): boolean {
    const changed = this.dispatch({
      type: "MOVE_PLACEMENT_HANDLE",
      placementOffset,
    });
    if (changed) {
      this.displayedBall = copyVector(this.interaction.session.ballPosition);
    }
    return changed;
  }

  confirmPlacement(): boolean {
    return this.dispatch({ type: "CONFIRM_PLACEMENT" });
  }

  activateAdjustAim(): boolean {
    return this.dispatch({ type: "ACTIVATE_ADJUST_AIM" });
  }

  adjustAim(direction: Vector2): boolean {
    return this.dispatch({ type: "MOVE_AIMING_HANDLE", direction });
  }

  practicePutt(startedAtMs: number): boolean {
    if (!Number.isFinite(startedAtMs)) {
      return false;
    }
    const started = this.dispatch({ type: "PRACTICE_PUTT" });
    if (!started) {
      return false;
    }
    this.rollStartedAtMs = startedAtMs;
    this.displayedBall = copyVector(
      this.interaction.session.startingBallPosition,
    );
    return true;
  }

  tick(nowMs: number): RollFrame | null {
    const session = this.interaction.session;
    if (
      session.phase !== "rolling" ||
      session.puttEndpoint === null ||
      this.rollStartedAtMs === null ||
      !Number.isFinite(nowMs)
    ) {
      return null;
    }

    const frame = samplePuttRoll(
      session.startingBallPosition,
      session.puttEndpoint,
      (nowMs - this.rollStartedAtMs) / 1000,
    );
    this.displayedBall = copyVector(frame.position);

    if (frame.complete) {
      this.dispatch({ type: "COMPLETE_ROLL" });
      this.rollStartedAtMs = null;
    }
    return frame;
  }

  tryAgain(): boolean {
    const changed = this.dispatch({ type: "TRY_AGAIN" });
    if (changed) {
      this.displayedBall = copyVector(this.interaction.session.ballPosition);
      this.rollStartedAtMs = null;
    }
    return changed;
  }

  resetSetup(): boolean {
    const changed = this.dispatch({ type: "RESET_SETUP" });
    if (changed) {
      this.displayedBall = copyVector(this.interaction.session.ballPosition);
      this.rollStartedAtMs = null;
    }
    return changed;
  }
}
