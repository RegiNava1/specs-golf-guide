export const CENTIMETERS_PER_FOOT = 30.48

export const PRACTICE_RANGE_DISTANCES_FT = [5, 10, 15, 20, 25] as const

export type PracticeRangeDistanceFt =
  (typeof PRACTICE_RANGE_DISTANCES_FT)[number]

export const DEFAULT_PRACTICE_RANGE_DISTANCE_FT: PracticeRangeDistanceFt = 15

export type PracticeRangeLifecycleAction = "retry-shot" | "reset-all"

export function practiceRangeFeetToCentimeters(distanceFt: number): number {
  return distanceFt * CENTIMETERS_PER_FOOT
}

export function isPracticeRangeDistanceFt(
  value: number
): value is PracticeRangeDistanceFt {
  return PRACTICE_RANGE_DISTANCES_FT.some((distance) => distance === value)
}

export function getAdjacentPracticeRangeDistance(
  current: number,
  direction: -1 | 1
): PracticeRangeDistanceFt | null {
  if (!isPracticeRangeDistanceFt(current)) {
    return null
  }
  const currentIndex = PRACTICE_RANGE_DISTANCES_FT.indexOf(current)
  const adjacent = PRACTICE_RANGE_DISTANCES_FT[currentIndex + direction]
  return adjacent ?? null
}

export function resolvePracticeRangeLifecycleDistance(
  current: number,
  action: PracticeRangeLifecycleAction
): PracticeRangeDistanceFt {
  if (action === "reset-all") {
    return DEFAULT_PRACTICE_RANGE_DISTANCE_FT
  }
  return isPracticeRangeDistanceFt(current)
    ? current
    : DEFAULT_PRACTICE_RANGE_DISTANCE_FT
}
