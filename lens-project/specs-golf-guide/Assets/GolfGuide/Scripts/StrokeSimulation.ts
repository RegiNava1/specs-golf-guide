/**
 * Pure variable-distance virtual-stroke model shared by Node and Lens runtime.
 * It must remain deterministic and independent of scene or sensor APIs.
 */
import {
  DeterministicPuttingEngine,
  INITIAL_TARGET_ZONE_DIAMETER_CM,
  type PuttOutcome,
  type Vector2,
} from "./puttingEngine";

export type AimDeviation = "Aligned" | "Left of Aim" | "Right of Aim";

export type DistanceFeedback = "Short" | "On Distance" | "Long";

export interface StrokeSetup {
  readonly ball: Vector2;
  readonly target: Vector2;
  readonly selectedAimDirection: Vector2;
  readonly targetZoneDiameterCm?: number;
}

export interface StrokeInput {
  readonly direction: Vector2;
  /**
   * Distance multiplier chosen by the player. A value of 1 travels the
   * ball-to-target distance, 0 leaves the ball at rest, and values above 1
   * travel beyond the target. It is not a measured club-speed value.
   */
  readonly strength: number;
}

export interface StrokeOutcome {
  readonly endpoint: Vector2;
  readonly travelDistanceCm: number;
  readonly aimDeviation: AimDeviation;
  readonly distanceFeedback: DistanceFeedback;
  /** Existing three-label practice-zone result, preserved without changes. */
  readonly puttingOutcome: PuttOutcome;
}

const COMPARISON_EPSILON = 1e-9;

function assertFiniteVector(name: string, vector: Vector2): void {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
    throw new Error(`${name} must contain finite coordinates.`);
  }
}

function subtract(left: Vector2, right: Vector2): Vector2 {
  return {x: left.x - right.x, y: left.y - right.y};
}

function magnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}

function normalize(name: string, vector: Vector2): Vector2 {
  assertFiniteVector(name, vector);
  const length = magnitude(vector);
  if (length === 0) {
    throw new Error(`${name} must not be a zero-length vector.`);
  }
  return {x: vector.x / length, y: vector.y / length};
}

function dot(left: Vector2, right: Vector2): number {
  return left.x * right.x + left.y * right.y;
}

function cross(left: Vector2, right: Vector2): number {
  return left.x * right.y - left.y * right.x;
}

export class DeterministicStrokeModel {
  readonly ball: Vector2;
  readonly target: Vector2;
  readonly selectedAimDirection: Vector2;
  readonly nominalTravelDistanceCm: number;
  readonly targetZoneDiameterCm: number;

  private readonly targetDirection: Vector2;
  private readonly puttingEngine: DeterministicPuttingEngine;

  constructor(setup: StrokeSetup) {
    assertFiniteVector("ball", setup.ball);
    assertFiniteVector("target", setup.target);

    const ballToTarget = subtract(setup.target, setup.ball);
    const nominalTravelDistanceCm = magnitude(ballToTarget);
    if (nominalTravelDistanceCm === 0) {
      throw new Error("ball and target must occupy different positions.");
    }

    this.ball = {x: setup.ball.x, y: setup.ball.y};
    this.target = {x: setup.target.x, y: setup.target.y};
    this.selectedAimDirection = normalize(
      "selectedAimDirection",
      setup.selectedAimDirection,
    );
    this.nominalTravelDistanceCm = nominalTravelDistanceCm;
    this.targetZoneDiameterCm =
      setup.targetZoneDiameterCm ?? INITIAL_TARGET_ZONE_DIAMETER_CM;
    this.targetDirection = normalize("target direction", ballToTarget);

    this.puttingEngine = new DeterministicPuttingEngine({
      ball: this.ball,
      target: this.target,
      defaultAimDirection: this.selectedAimDirection,
      targetZoneDiameterCm: this.targetZoneDiameterCm,
    });
  }

  simulateStroke(input: StrokeInput): StrokeOutcome {
    if (!Number.isFinite(input.strength) || input.strength < 0) {
      throw new Error("strength must be a finite number greater than or equal to zero.");
    }

    const strokeDirection = normalize("stroke direction", input.direction);
    const travelDistanceCm = this.nominalTravelDistanceCm * input.strength;
    const endpoint = {
      x: this.ball.x + strokeDirection.x * travelDistanceCm,
      y: this.ball.y + strokeDirection.y * travelDistanceCm,
    };

    const signedAimAngle = Math.atan2(
      cross(this.selectedAimDirection, strokeDirection),
      dot(this.selectedAimDirection, strokeDirection),
    );
    let aimDeviation: AimDeviation = "Aligned";
    if (signedAimAngle > COMPARISON_EPSILON) {
      aimDeviation = "Left of Aim";
    } else if (signedAimAngle < -COMPARISON_EPSILON) {
      aimDeviation = "Right of Aim";
    }

    const targetToEndpoint = subtract(endpoint, this.target);
    const longitudinalOffsetCm = dot(targetToEndpoint, this.targetDirection);
    const targetZoneRadiusCm = this.targetZoneDiameterCm / 2;
    let distanceFeedback: DistanceFeedback = "On Distance";
    if (longitudinalOffsetCm < -targetZoneRadiusCm - COMPARISON_EPSILON) {
      distanceFeedback = "Short";
    } else if (longitudinalOffsetCm > targetZoneRadiusCm + COMPARISON_EPSILON) {
      distanceFeedback = "Long";
    }

    return {
      endpoint,
      travelDistanceCm,
      aimDeviation,
      distanceFeedback,
      puttingOutcome: this.puttingEngine.evaluateEndpoint(endpoint),
    };
  }
}

export function createDefaultStrokeModel(
  selectedAimDirection: Vector2 = {x: 0, y: 1},
): DeterministicStrokeModel {
  return new DeterministicStrokeModel({
    ball: {x: 0, y: 0},
    target: {x: 0, y: 150},
    selectedAimDirection,
  });
}
