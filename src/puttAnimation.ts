import type { Vector2 } from "./puttingEngine.ts";

/** Fixed visual duration from the approved design brief. */
export const PUTT_ROLL_DURATION_SECONDS = 1.5;

export interface RollFrame {
  readonly position: Vector2;
  readonly progress: number;
  readonly complete: boolean;
}

/** Pure visual interpolation; endpoint and outcome must come from the reducer. */
export function samplePuttRoll(start: Vector2, endpoint: Vector2, elapsedSeconds: number): RollFrame {
  if (![start.x, start.y, endpoint.x, endpoint.y, elapsedSeconds].every(Number.isFinite)) {
    throw new Error("Roll inputs must be finite.");
  }
  const progress = Math.min(1, Math.max(0, elapsedSeconds / PUTT_ROLL_DURATION_SECONDS));
  return {
    position: {
      x: start.x + (endpoint.x - start.x) * progress,
      y: start.y + (endpoint.y - start.y) * progress,
    },
    progress,
    complete: progress === 1,
  };
}
