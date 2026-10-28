import type { Vector2 } from "./puttingEngine.ts";

/** All positions use centimeters. The 2D putting plane is x=right, y=forward. */
export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Floor elevation and orientation are supplied by a future Lens Studio adapter. */
export interface FloorBasis {
  readonly origin: Vector3;
  readonly right: Vector3;
  readonly forward: Vector3;
}

const EPSILON = 1e-9;

function finite3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function length3(vector: Vector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function dot3(left: Vector3, right: Vector3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

/** Prevent distorted scale, non-planar directions, and invalid geometry. */
export function validateFloorBasis(basis: FloorBasis): void {
  if (!finite3(basis.origin) || !finite3(basis.right) || !finite3(basis.forward)) {
    throw new Error("Floor basis vectors must be finite.");
  }
  if (Math.abs(length3(basis.right) - 1) > EPSILON ||
      Math.abs(length3(basis.forward) - 1) > EPSILON ||
      Math.abs(dot3(basis.right, basis.forward)) > EPSILON) {
    throw new Error("Floor right and forward axes must be orthonormal.");
  }
}

/** Maps a logic-plane point to the floor; no hidden assumption about Lens world axes. */
export function floorPoint(point: Vector2, basis: FloorBasis): Vector3 {
  validateFloorBasis(basis);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Logic point must be finite.");
  }
  return {
    x: basis.origin.x + basis.right.x * point.x + basis.forward.x * point.y,
    y: basis.origin.y + basis.right.y * point.x + basis.forward.y * point.y,
    z: basis.origin.z + basis.right.z * point.x + basis.forward.z * point.y,
  };
}

/** Maps a normalized logic direction into an equally normalized world direction. */
export function floorDirection(direction: Vector2, basis: FloorBasis): Vector3 {
  validateFloorBasis(basis);
  if (!Number.isFinite(direction.x) || !Number.isFinite(direction.y)) {
    throw new Error("Aim direction must be finite.");
  }
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude === 0) {
    throw new Error("Aim direction cannot be zero.");
  }
  return {
    x: (basis.right.x * direction.x + basis.forward.x * direction.y) / magnitude,
    y: (basis.right.y * direction.x + basis.forward.y * direction.y) / magnitude,
    z: (basis.right.z * direction.x + basis.forward.z * direction.y) / magnitude,
  };
}

/** Local child position when the parent setup root owns the placement offset. */
export function setupLocalPoint(worldLogicPoint: Vector2, placementOffset: Vector2): Vector2 {
  if (![worldLogicPoint.x, worldLogicPoint.y, placementOffset.x, placementOffset.y].every(Number.isFinite)) {
    throw new Error("Logic coordinates must be finite.");
  }
  return {
    x: worldLogicPoint.x - placementOffset.x,
    y: worldLogicPoint.y - placementOffset.y,
  };
}
