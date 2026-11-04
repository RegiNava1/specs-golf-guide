/**
 * Pure transient virtual-stroke gesture state machine shared by Node and Lens.
 * The longer file is intentional: it centralizes validation, snapshots, and
 * defensive copies so runtime bindings cannot corrupt deterministic state.
 */
import type {Vector2} from "./puttingEngine";
import {
  DeterministicStrokeModel,
  type StrokeOutcome,
} from "./StrokeSimulation";

export type StrokeInputPhase =
  | "idle"
  | "addressed"
  | "backswing"
  | "forward-stroke"
  | "impacted"
  | "cancelled";

export interface StrokeInputAdapterConfig {
  /** Maximum distance from the virtual ball at which a gesture may begin. */
  readonly addressRadiusCm?: number;
  /** Required backward projection before a forward stroke can begin. */
  readonly minimumBackswingCm?: number;
  /** Required forward progress from the farthest backswing point. */
  readonly minimumForwardProgressCm?: number;
  /** Minimum total backswing-to-impact displacement. */
  readonly minimumStrokeDisplacementCm?: number;
  /** Displacement that maps to stroke-model strength 1. */
  readonly referenceStrokeDisplacementCm?: number;
  /** Small tolerance for deciding whether the stroke reached the ball plane. */
  readonly impactPlaneToleranceCm?: number;
}

export interface CapturedVirtualStroke {
  readonly direction: Vector2;
  readonly strength: number;
  readonly outcome: StrokeOutcome;
}

export interface StrokeInputSnapshot {
  readonly phase: StrokeInputPhase;
  readonly addressedPoint: Vector2 | null;
  readonly farthestBackswingPoint: Vector2 | null;
  readonly currentPoint: Vector2 | null;
  readonly capturedStroke: CapturedVirtualStroke | null;
}

interface ResolvedConfig {
  readonly addressRadiusCm: number;
  readonly minimumBackswingCm: number;
  readonly minimumForwardProgressCm: number;
  readonly minimumStrokeDisplacementCm: number;
  readonly referenceStrokeDisplacementCm: number;
  readonly impactPlaneToleranceCm: number;
}

const DEFAULT_CONFIG: ResolvedConfig = {
  addressRadiusCm: 6,
  minimumBackswingCm: 5,
  minimumForwardProgressCm: 1,
  minimumStrokeDisplacementCm: 5,
  referenceStrokeDisplacementCm: 30,
  impactPlaneToleranceCm: 0.5,
};

function isFiniteVector(vector: Vector2): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y);
}

function copyVector(vector: Vector2): Vector2 {
  return {x: vector.x, y: vector.y};
}

function subtract(left: Vector2, right: Vector2): Vector2 {
  return {x: left.x - right.x, y: left.y - right.y};
}

function magnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}

function dot(left: Vector2, right: Vector2): number {
  return left.x * right.x + left.y * right.y;
}

function copyCapture(capture: CapturedVirtualStroke): CapturedVirtualStroke {
  return {
    direction: copyVector(capture.direction),
    strength: capture.strength,
    outcome: {
      ...capture.outcome,
      endpoint: copyVector(capture.outcome.endpoint),
      puttingOutcome: {
        ...capture.outcome.puttingOutcome,
        endpoint: copyVector(capture.outcome.puttingOutcome.endpoint),
      },
    },
  };
}

function resolveConfig(config: StrokeInputAdapterConfig): ResolvedConfig {
  const resolved = {...DEFAULT_CONFIG, ...config};
  const nonnegative: ReadonlyArray<keyof ResolvedConfig> = [
    "addressRadiusCm",
    "impactPlaneToleranceCm",
  ];
  const positive: ReadonlyArray<keyof ResolvedConfig> = [
    "minimumBackswingCm",
    "minimumForwardProgressCm",
    "minimumStrokeDisplacementCm",
    "referenceStrokeDisplacementCm",
  ];

  for (const key of nonnegative) {
    if (!Number.isFinite(resolved[key]) || resolved[key] < 0) {
      throw new Error(`${key} must be a finite nonnegative number.`);
    }
  }
  for (const key of positive) {
    if (!Number.isFinite(resolved[key]) || resolved[key] <= 0) {
      throw new Error(`${key} must be a finite positive number.`);
    }
  }

  return resolved;
}

/**
 * Captures one back-and-forward gesture in the same centimeter logic plane as
 * the deterministic stroke model. Camera/head data is deliberately absent.
 */
export class VirtualStrokeInputAdapter {
  private readonly strokeModel: DeterministicStrokeModel;
  private readonly config: ResolvedConfig;
  private currentPhase: StrokeInputPhase = "idle";
  private addressedPoint: Vector2 | null = null;
  private farthestBackswingPoint: Vector2 | null = null;
  private currentPoint: Vector2 | null = null;
  private capturedStroke: CapturedVirtualStroke | null = null;

  constructor(
    strokeModel: DeterministicStrokeModel,
    config: StrokeInputAdapterConfig = {},
  ) {
    this.strokeModel = strokeModel;
    this.config = resolveConfig(config);
  }

  get phase(): StrokeInputPhase {
    return this.currentPhase;
  }

  get lastCapturedStroke(): CapturedVirtualStroke | null {
    return this.capturedStroke === null ? null : copyCapture(this.capturedStroke);
  }

  getSnapshot(): StrokeInputSnapshot {
    return {
      phase: this.currentPhase,
      addressedPoint:
        this.addressedPoint === null ? null : copyVector(this.addressedPoint),
      farthestBackswingPoint:
        this.farthestBackswingPoint === null
          ? null
          : copyVector(this.farthestBackswingPoint),
      currentPoint:
        this.currentPoint === null ? null : copyVector(this.currentPoint),
      capturedStroke:
        this.capturedStroke === null ? null : copyCapture(this.capturedStroke),
    };
  }

  addressBall(point: Vector2): boolean {
    if (this.currentPhase !== "idle" || !isFiniteVector(point)) {
      return false;
    }

    if (magnitude(subtract(point, this.strokeModel.ball)) > this.config.addressRadiusCm) {
      return false;
    }

    this.addressedPoint = copyVector(point);
    this.currentPoint = copyVector(point);
    this.currentPhase = "addressed";
    return true;
  }

  startBackswing(): boolean {
    if (this.currentPhase !== "addressed" || this.addressedPoint === null) {
      return false;
    }

    this.farthestBackswingPoint = copyVector(this.addressedPoint);
    this.currentPhase = "backswing";
    return true;
  }

  trackBackswing(point: Vector2): boolean {
    if (this.currentPhase !== "backswing") {
      return false;
    }
    if (!isFiniteVector(point)) {
      this.cancelActiveStroke();
      return false;
    }

    this.currentPoint = copyVector(point);
    const currentProjection = this.projectionFromBall(point);
    const farthestProjection = this.farthestBackswingPoint === null
      ? Number.POSITIVE_INFINITY
      : this.projectionFromBall(this.farthestBackswingPoint);
    if (currentProjection < farthestProjection) {
      this.farthestBackswingPoint = copyVector(point);
    }
    return true;
  }

  startForwardStroke(point: Vector2): boolean {
    if (this.currentPhase !== "backswing") {
      return false;
    }
    if (!isFiniteVector(point) || this.farthestBackswingPoint === null) {
      this.cancelActiveStroke();
      return false;
    }

    const backswingProjection = this.projectionFromBall(this.farthestBackswingPoint);
    const forwardProgress = dot(
      subtract(point, this.farthestBackswingPoint),
      this.strokeModel.selectedAimDirection,
    );
    if (
      backswingProjection > -this.config.minimumBackswingCm ||
      forwardProgress < this.config.minimumForwardProgressCm
    ) {
      this.cancelActiveStroke();
      return false;
    }

    this.currentPoint = copyVector(point);
    this.currentPhase = "forward-stroke";
    return true;
  }

  canStartForwardStroke(point: Vector2): boolean {
    if (
      this.currentPhase !== "backswing" ||
      !isFiniteVector(point) ||
      this.farthestBackswingPoint === null
    ) {
      return false;
    }

    const backswingProjection = this.projectionFromBall(this.farthestBackswingPoint);
    const forwardProgress = dot(
      subtract(point, this.farthestBackswingPoint),
      this.strokeModel.selectedAimDirection,
    );
    return (
      backswingProjection <= -this.config.minimumBackswingCm &&
      forwardProgress >= this.config.minimumForwardProgressCm
    );
  }

  trackForwardStroke(point: Vector2): boolean {
    if (this.currentPhase !== "forward-stroke") {
      return false;
    }
    if (!isFiniteVector(point)) {
      this.cancelActiveStroke();
      return false;
    }

    this.currentPoint = copyVector(point);
    return true;
  }

  completeStroke(impactPoint: Vector2): CapturedVirtualStroke | null {
    if (this.currentPhase === "impacted") {
      return null;
    }
    if (this.currentPhase !== "forward-stroke") {
      if (this.currentPhase === "addressed" || this.currentPhase === "backswing") {
        this.cancelActiveStroke();
      }
      return null;
    }
    if (!isFiniteVector(impactPoint) || this.farthestBackswingPoint === null) {
      this.cancelActiveStroke();
      return null;
    }

    const strokeDisplacement = subtract(
      impactPoint,
      this.farthestBackswingPoint,
    );
    const displacementCm = magnitude(strokeDisplacement);
    const forwardDisplacementCm = dot(
      strokeDisplacement,
      this.strokeModel.selectedAimDirection,
    );
    if (
      this.projectionFromBall(impactPoint) < -this.config.impactPlaneToleranceCm ||
      displacementCm < this.config.minimumStrokeDisplacementCm ||
      forwardDisplacementCm <= 0
    ) {
      this.cancelActiveStroke();
      return null;
    }

    const direction = {
      x: strokeDisplacement.x / displacementCm,
      y: strokeDisplacement.y / displacementCm,
    };
    const strength = displacementCm / this.config.referenceStrokeDisplacementCm;
    const capture: CapturedVirtualStroke = {
      direction,
      strength,
      outcome: this.strokeModel.simulateStroke({direction, strength}),
    };

    this.currentPoint = copyVector(impactPoint);
    this.capturedStroke = capture;
    this.currentPhase = "impacted";
    return copyCapture(capture);
  }

  cancelStroke(): boolean {
    if (
      this.currentPhase !== "addressed" &&
      this.currentPhase !== "backswing" &&
      this.currentPhase !== "forward-stroke"
    ) {
      return false;
    }

    this.cancelActiveStroke();
    return true;
  }

  resetInput(): void {
    this.currentPhase = "idle";
    this.addressedPoint = null;
    this.farthestBackswingPoint = null;
    this.currentPoint = null;
    this.capturedStroke = null;
  }

  private projectionFromBall(point: Vector2): number {
    return dot(
      subtract(point, this.strokeModel.ball),
      this.strokeModel.selectedAimDirection,
    );
  }

  private cancelActiveStroke(): void {
    this.currentPhase = "cancelled";
    this.addressedPoint = null;
    this.farthestBackswingPoint = null;
    this.currentPoint = null;
    this.capturedStroke = null;
  }
}
