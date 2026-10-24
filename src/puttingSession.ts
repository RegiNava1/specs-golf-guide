import {
  DeterministicPuttingEngine,
  INITIAL_TARGET_ZONE_DIAMETER_CM,
  type PuttOutcome,
  type PuttingSetup,
  type Vector2,
} from "./puttingEngine.ts";

export type PuttingSessionPhase =
  | "initial-placement"
  | "moving-setup"
  | "aiming"
  | "rolling"
  | "result";

export type PuttingSessionAction =
  | { readonly type: "MOVE_SETUP"; readonly placementOffset: Vector2 }
  | { readonly type: "CONFIRM_PLACEMENT" }
  | { readonly type: "ADJUST_AIM"; readonly direction: Vector2 }
  | { readonly type: "PRACTICE_PUTT" }
  | { readonly type: "COMPLETE_ROLL" }
  | { readonly type: "TRY_AGAIN" }
  | { readonly type: "RESET_SETUP" };

export interface PuttingSessionState {
  readonly phase: PuttingSessionPhase;
  readonly initialBallPosition: Vector2;
  readonly initialTargetPosition: Vector2;
  readonly defaultAimDirection: Vector2;
  readonly targetZoneDiameterCm: number;
  readonly placementOffset: Vector2;
  readonly startingBallPosition: Vector2;
  readonly targetPosition: Vector2;
  readonly aimDirection: Vector2;
  readonly ballPosition: Vector2;
  readonly puttEndpoint: Vector2 | null;
  readonly outcome: PuttOutcome | null;
}

export const DEFAULT_BALL_POSITION: Vector2 = { x: 0, y: 0 };
export const DEFAULT_TARGET_POSITION: Vector2 = { x: 0, y: 150 };

function copyVector(vector: Vector2): Vector2 {
  return { x: vector.x, y: vector.y };
}

function add(left: Vector2, right: Vector2): Vector2 {
  return { x: left.x + right.x, y: left.y + right.y };
}

function isFiniteVector(vector: Vector2): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y);
}

function createEngineForState(
  state: PuttingSessionState,
): DeterministicPuttingEngine {
  const engine = new DeterministicPuttingEngine({
    ball: state.startingBallPosition,
    target: state.targetPosition,
    defaultAimDirection: state.defaultAimDirection,
    targetZoneDiameterCm: state.targetZoneDiameterCm,
  });
  engine.setAimDirection(state.aimDirection);
  return engine;
}

export function createPuttingSession(
  setup: PuttingSetup = {
    ball: DEFAULT_BALL_POSITION,
    target: DEFAULT_TARGET_POSITION,
    targetZoneDiameterCm: INITIAL_TARGET_ZONE_DIAMETER_CM,
  },
): PuttingSessionState {
  const engine = new DeterministicPuttingEngine(setup);
  const initialBallPosition = copyVector(engine.ball);
  const initialTargetPosition = copyVector(engine.target);
  const defaultAimDirection = engine.aimDirection;

  return {
    phase: "initial-placement",
    initialBallPosition,
    initialTargetPosition,
    defaultAimDirection,
    targetZoneDiameterCm: engine.targetZoneDiameterCm,
    placementOffset: { x: 0, y: 0 },
    startingBallPosition: copyVector(initialBallPosition),
    targetPosition: copyVector(initialTargetPosition),
    aimDirection: copyVector(defaultAimDirection),
    ballPosition: copyVector(initialBallPosition),
    puttEndpoint: null,
    outcome: null,
  };
}

export function transitionPuttingSession(
  state: PuttingSessionState,
  action: PuttingSessionAction,
): PuttingSessionState {
  switch (action.type) {
    case "MOVE_SETUP": {
      if (
        (state.phase !== "initial-placement" &&
          state.phase !== "moving-setup") ||
        !isFiniteVector(action.placementOffset)
      ) {
        return state;
      }

      const placementOffset = copyVector(action.placementOffset);
      const startingBallPosition = add(
        state.initialBallPosition,
        placementOffset,
      );
      const targetPosition = add(state.initialTargetPosition, placementOffset);

      return {
        ...state,
        phase: "moving-setup",
        placementOffset,
        startingBallPosition,
        targetPosition,
        ballPosition: copyVector(startingBallPosition),
        puttEndpoint: null,
        outcome: null,
      };
    }

    case "CONFIRM_PLACEMENT":
      if (
        state.phase !== "initial-placement" &&
        state.phase !== "moving-setup"
      ) {
        return state;
      }
      return { ...state, phase: "aiming" };

    case "ADJUST_AIM": {
      if (state.phase !== "aiming") {
        return state;
      }

      try {
        const engine = createEngineForState(state);
        engine.setAimDirection(action.direction);
        return {
          ...state,
          aimDirection: engine.aimDirection,
          puttEndpoint: null,
          outcome: null,
        };
      } catch {
        return state;
      }
    }

    case "PRACTICE_PUTT": {
      if (state.phase !== "aiming") {
        return state;
      }

      const outcome = createEngineForState(state).simulatePutt();
      return {
        ...state,
        phase: "rolling",
        ballPosition: copyVector(state.startingBallPosition),
        puttEndpoint: copyVector(outcome.endpoint),
        outcome,
      };
    }

    case "COMPLETE_ROLL":
      if (
        state.phase !== "rolling" ||
        state.puttEndpoint === null ||
        state.outcome === null
      ) {
        return state;
      }
      return {
        ...state,
        phase: "result",
        ballPosition: copyVector(state.puttEndpoint),
      };

    case "TRY_AGAIN":
      if (state.phase !== "result") {
        return state;
      }
      return {
        ...state,
        phase: "aiming",
        ballPosition: copyVector(state.startingBallPosition),
        puttEndpoint: null,
        outcome: null,
      };

    case "RESET_SETUP":
      return createPuttingSession({
        ball: state.initialBallPosition,
        target: state.initialTargetPosition,
        defaultAimDirection: state.defaultAimDirection,
        targetZoneDiameterCm: state.targetZoneDiameterCm,
      });

    default:
      return state;
  }
}
