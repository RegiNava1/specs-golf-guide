import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_PRACTICE_RANGE_DISTANCE_CM,
  getAdjacentPracticeRangeDistance,
  isPracticeRangeDistanceCm,
  PRACTICE_RANGE_DISTANCES_CM,
} from "../lens-project/specs-golf-guide/Assets/GolfGuide/Scripts/PracticeRange.ts"

test("practice range exposes exactly the six approved centimeter distances", () => {
  assert.deepEqual(PRACTICE_RANGE_DISTANCES_CM, [25, 50, 75, 100, 125, 150])
})

test("practice range defaults to 150 cm", () => {
  assert.equal(DEFAULT_PRACTICE_RANGE_DISTANCE_CM, 150)
})

test("practice range rejects unsupported and malformed distances", () => {
  for (const distance of PRACTICE_RANGE_DISTANCES_CM) {
    assert.equal(isPracticeRangeDistanceCm(distance), true)
  }

  for (const invalid of [0, 24, 26, 149, 151, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(isPracticeRangeDistanceCm(invalid), false)
  }
})

test("practice range stepping is bounded and exposes adjacent values", () => {
  assert.equal(getAdjacentPracticeRangeDistance(25, -1), null)
  assert.equal(getAdjacentPracticeRangeDistance(25, 1), 50)
  assert.equal(getAdjacentPracticeRangeDistance(100, -1), 75)
  assert.equal(getAdjacentPracticeRangeDistance(100, 1), 125)
  assert.equal(getAdjacentPracticeRangeDistance(150, -1), 125)
  assert.equal(getAdjacentPracticeRangeDistance(150, 1), null)
  assert.equal(getAdjacentPracticeRangeDistance(37, 1), null)
})
