export const PRACTICE_RANGE_DISTANCES_CM = [25, 50, 75, 100, 125, 150] as const

export type PracticeRangeDistanceCm =
  (typeof PRACTICE_RANGE_DISTANCES_CM)[number]

export const DEFAULT_PRACTICE_RANGE_DISTANCE_CM: PracticeRangeDistanceCm = 150

export function isPracticeRangeDistanceCm(
  value: number
): value is PracticeRangeDistanceCm {
  return PRACTICE_RANGE_DISTANCES_CM.some((distance) => distance === value)
}
