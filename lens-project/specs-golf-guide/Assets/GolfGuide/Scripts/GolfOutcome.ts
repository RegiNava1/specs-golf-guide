/**
 * Pure floor-plane outcome calculation for the Lens adapter.
 * Mirrors src/puttingEngine.ts without importing files outside Assets.
 */
export type PuttClassification =
  | "On Target"
  | "Missed Left"
  | "Missed Right"

export interface FloorPoint {
  readonly x: number
  readonly z: number
}

export interface PuttOutcomeFeedback {
  readonly classification: PuttClassification
  readonly distanceFromTargetCm: number
  readonly isWithinTargetZone: boolean
}

export const PRACTICE_TARGET_ZONE_DIAMETER_CM = 22.5
const COMPARISON_EPSILON_CM = 1e-9

export function classifyPuttEndpoint(
  endpoint: FloorPoint,
  target: FloorPoint,
  startingBall: FloorPoint
): PuttOutcomeFeedback {
  const targetDx = target.x - startingBall.x
  const targetForward = startingBall.z - target.z
  const targetDistance = Math.sqrt(
    targetDx * targetDx + targetForward * targetForward
  )
  if (!Number.isFinite(targetDistance) || targetDistance <= 0) {
    throw new Error("Starting ball and target must be finite, distinct points.")
  }

  const errorX = endpoint.x - target.x
  const errorForward = target.z - endpoint.z
  const distanceFromTargetCm = Math.sqrt(
    errorX * errorX + errorForward * errorForward
  )
  if (!Number.isFinite(distanceFromTargetCm)) {
    throw new Error("Endpoint must contain finite coordinates.")
  }

  const targetZoneRadiusCm = PRACTICE_TARGET_ZONE_DIAMETER_CM / 2
  const isWithinTargetZone =
    distanceFromTargetCm <= targetZoneRadiusCm + COMPARISON_EPSILON_CM
  if (isWithinTargetZone) {
    return {classification: "On Target", distanceFromTargetCm, isWithinTargetZone}
  }

  const targetDirectionX = targetDx / targetDistance
  const targetDirectionForward = targetForward / targetDistance
  const signedLateralOffsetCm =
    errorX * -targetDirectionForward + errorForward * targetDirectionX

  return {
    classification: signedLateralOffsetCm > 0 ? "Missed Left" : "Missed Right",
    distanceFromTargetCm,
    isWithinTargetZone,
  }
}
