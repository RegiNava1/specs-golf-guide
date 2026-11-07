const CENTIMETERS_PER_FOOT = 30.48

export type WorldPointCm = {
  x: number
  y: number
  z: number
}

export type DistanceToHole = {
  centimeters: number
  feet: number
}

function isFiniteWorldPoint(point: WorldPointCm | null | undefined): boolean {
  return (
    point !== null &&
    point !== undefined &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Number.isFinite(point.z)
  )
}

/**
 * Returns the actual horizontal X/Z distance from the virtual ball to the
 * fixed hole. World-space Y is validated but deliberately excluded from the
 * ground-plane measurement.
 */
export function calculateDistanceToHole(
  ballWorldPosition: WorldPointCm | null | undefined,
  holeWorldPosition: WorldPointCm | null | undefined
): DistanceToHole | null {
  if (
    !isFiniteWorldPoint(ballWorldPosition) ||
    !isFiniteWorldPoint(holeWorldPosition)
  ) {
    return null
  }

  const deltaX = holeWorldPosition.x - ballWorldPosition.x
  const deltaZ = holeWorldPosition.z - ballWorldPosition.z
  const centimeters = Math.hypot(deltaX, deltaZ)
  if (!Number.isFinite(centimeters)) {
    return null
  }

  return {
    centimeters,
    feet: centimeters / CENTIMETERS_PER_FOOT,
  }
}

export function formatDistanceToHoleFeet(distanceFeet: number | null): string {
  return Number.isFinite(distanceFeet) && distanceFeet !== null && distanceFeet >= 0
    ? `${distanceFeet.toFixed(1)} ft`
    : "—"
}
