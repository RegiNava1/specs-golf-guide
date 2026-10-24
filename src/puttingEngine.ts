export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export type PuttClassification =
  | "On Target"
  | "Missed Left"
  | "Missed Right";

export interface PuttingSetup {
  readonly ball: Vector2;
  readonly target: Vector2;
  readonly defaultAimDirection?: Vector2;
  readonly targetZoneDiameterCm?: number;
}

export interface PuttOutcome {
  readonly endpoint: Vector2;
  readonly classification: PuttClassification;
  readonly isWithinTargetZone: boolean;
  readonly isWithinRegulationHole: boolean;
}

export const INITIAL_TARGET_ZONE_DIAMETER_CM = 22.5;
export const REGULATION_HOLE_DIAMETER_CM = 10.8;

const MIN_TARGET_ZONE_DIAMETER_CM = 20;
const MAX_TARGET_ZONE_DIAMETER_CM = 25;
const COMPARISON_EPSILON_CM = 1e-9;

function assertFiniteVector(name: string, vector: Vector2): void {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
    throw new Error(`${name} must contain finite coordinates.`);
  }
}

function copyVector(vector: Vector2): Vector2 {
  return { x: vector.x, y: vector.y };
}

function subtract(left: Vector2, right: Vector2): Vector2 {
  return { x: left.x - right.x, y: left.y - right.y };
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

  return { x: vector.x / length, y: vector.y / length };
}

function distance(left: Vector2, right: Vector2): number {
  return magnitude(subtract(left, right));
}

export class DeterministicPuttingEngine {
  readonly ball: Vector2;
  readonly target: Vector2;
  readonly travelDistanceCm: number;
  readonly targetZoneDiameterCm: number;

  private readonly targetDirection: Vector2;
  private readonly defaultAimDirection: Vector2;
  private currentAimDirection: Vector2;

  constructor(setup: PuttingSetup) {
    assertFiniteVector("ball", setup.ball);
    assertFiniteVector("target", setup.target);

    const ballToTarget = subtract(setup.target, setup.ball);
    const travelDistanceCm = magnitude(ballToTarget);
    if (travelDistanceCm === 0) {
      throw new Error("ball and target must occupy different positions.");
    }

    const targetZoneDiameterCm =
      setup.targetZoneDiameterCm ?? INITIAL_TARGET_ZONE_DIAMETER_CM;
    if (
      !Number.isFinite(targetZoneDiameterCm) ||
      targetZoneDiameterCm < MIN_TARGET_ZONE_DIAMETER_CM ||
      targetZoneDiameterCm > MAX_TARGET_ZONE_DIAMETER_CM
    ) {
      throw new Error("targetZoneDiameterCm must be between 20 and 25 cm.");
    }

    this.ball = copyVector(setup.ball);
    this.target = copyVector(setup.target);
    this.travelDistanceCm = travelDistanceCm;
    this.targetZoneDiameterCm = targetZoneDiameterCm;
    this.targetDirection = normalize("target direction", ballToTarget);
    this.defaultAimDirection = normalize(
      "defaultAimDirection",
      setup.defaultAimDirection ?? ballToTarget,
    );
    this.currentAimDirection = copyVector(this.defaultAimDirection);
  }

  get aimDirection(): Vector2 {
    return copyVector(this.currentAimDirection);
  }

  setAimDirection(direction: Vector2): void {
    this.currentAimDirection = normalize("aim direction", direction);
  }

  resetAim(): void {
    this.currentAimDirection = copyVector(this.defaultAimDirection);
  }

  calculateEndpoint(): Vector2 {
    return {
      x: this.ball.x + this.currentAimDirection.x * this.travelDistanceCm,
      y: this.ball.y + this.currentAimDirection.y * this.travelDistanceCm,
    };
  }

  simulatePutt(): PuttOutcome {
    return this.evaluateEndpoint(this.calculateEndpoint());
  }

  evaluateEndpoint(endpoint: Vector2): PuttOutcome {
    assertFiniteVector("endpoint", endpoint);

    const distanceFromTargetCm = distance(endpoint, this.target);
    const targetZoneRadiusCm = this.targetZoneDiameterCm / 2;
    const holeRadiusCm = REGULATION_HOLE_DIAMETER_CM / 2;
    const isWithinTargetZone =
      distanceFromTargetCm <= targetZoneRadiusCm + COMPARISON_EPSILON_CM;

    let classification: PuttClassification;
    if (isWithinTargetZone) {
      classification = "On Target";
    } else {
      const targetToEndpoint = subtract(endpoint, this.target);
      const leftNormal = {
        x: -this.targetDirection.y,
        y: this.targetDirection.x,
      };
      const signedLateralOffsetCm =
        targetToEndpoint.x * leftNormal.x +
        targetToEndpoint.y * leftNormal.y;

      // A perfectly collinear reverse aim is geometrically neither left nor right.
      // Resolve that singular case consistently to the right to keep the public
      // result set intentionally limited to the three product labels.
      classification =
        signedLateralOffsetCm > 0 ? "Missed Left" : "Missed Right";
    }

    return {
      endpoint: copyVector(endpoint),
      classification,
      isWithinTargetZone,
      isWithinRegulationHole:
        distanceFromTargetCm <= holeRadiusCm + COMPARISON_EPSILON_CM,
    };
  }
}

export function createDefaultPuttingEngine(): DeterministicPuttingEngine {
  return new DeterministicPuttingEngine({
    ball: { x: 0, y: 0 },
    target: { x: 0, y: 150 },
  });
}
