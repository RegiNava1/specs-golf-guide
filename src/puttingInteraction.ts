import {
  createPuttingSession,
  transitionPuttingSession,
  type PuttingSessionAction,
  type PuttingSessionState,
} from "./puttingSession.ts";
import type { PuttingSetup, Vector2 } from "./puttingEngine.ts";

export type PuttingInteractionMode =
  | "idle"
  | "moving-setup"
  | "adjusting-aim";

export type PuttingInteractionAction =
  | { readonly type: "ACTIVATE_MOVE_SETUP" }
  | {
      readonly type: "MOVE_PLACEMENT_HANDLE";
      readonly placementOffset: Vector2;
    }
  | { readonly type: "CONFIRM_PLACEMENT" }
  | { readonly type: "ACTIVATE_ADJUST_AIM" }
  | {
      readonly type: "MOVE_AIMING_HANDLE";
      readonly direction: Vector2;
    }
  | { readonly type: "PRACTICE_PUTT" }
  | { readonly type: "COMPLETE_ROLL" }
  | { readonly type: "TRY_AGAIN" }
  | { readonly type: "RESET_SETUP" };

export interface PuttingInteractionState {
  readonly mode: PuttingInteractionMode;
  readonly session: PuttingSessionState;
}

export function createPuttingInteraction(
  setup?: PuttingSetup,
): PuttingInteractionState {
  return {
    mode: "idle",
    session: createPuttingSession(setup),
  };
}

function applySessionAction(
  state: PuttingInteractionState,
  action: PuttingSessionAction,
  mode: PuttingInteractionMode = state.mode,
): PuttingInteractionState {
  const session = transitionPuttingSession(state.session, action);
  if (session === state.session && mode === state.mode) {
    return state;
  }
  return { mode, session };
}

export function transitionPuttingInteraction(
  state: PuttingInteractionState,
  action: PuttingInteractionAction,
): PuttingInteractionState {
  switch (action.type) {
    case "ACTIVATE_MOVE_SETUP":
      if (
        state.mode !== "idle" ||
        (state.session.phase !== "initial-placement" &&
          state.session.phase !== "moving-setup")
      ) {
        return state;
      }
      return { ...state, mode: "moving-setup" };

    case "MOVE_PLACEMENT_HANDLE":
      if (state.mode !== "moving-setup") {
        return state;
      }
      return applySessionAction(state, {
        type: "MOVE_SETUP",
        placementOffset: action.placementOffset,
      });

    case "CONFIRM_PLACEMENT":
      if (
        state.session.phase !== "initial-placement" &&
        state.session.phase !== "moving-setup"
      ) {
        return state;
      }
      return applySessionAction(state, { type: "CONFIRM_PLACEMENT" }, "idle");

    case "ACTIVATE_ADJUST_AIM":
      if (state.mode !== "idle" || state.session.phase !== "aiming") {
        return state;
      }
      return { ...state, mode: "adjusting-aim" };

    case "MOVE_AIMING_HANDLE":
      if (
        state.mode !== "adjusting-aim" ||
        state.session.phase !== "aiming"
      ) {
        return state;
      }
      return applySessionAction(state, {
        type: "ADJUST_AIM",
        direction: action.direction,
      });

    case "PRACTICE_PUTT":
      if (state.session.phase !== "aiming") {
        return state;
      }
      return applySessionAction(state, { type: "PRACTICE_PUTT" }, "idle");

    case "COMPLETE_ROLL":
      if (state.session.phase !== "rolling") {
        return state;
      }
      return applySessionAction(state, { type: "COMPLETE_ROLL" }, "idle");

    case "TRY_AGAIN":
      if (state.session.phase !== "result") {
        return state;
      }
      return applySessionAction(state, { type: "TRY_AGAIN" }, "idle");

    case "RESET_SETUP":
      return applySessionAction(state, { type: "RESET_SETUP" }, "idle");

    default:
      return state;
  }
}
