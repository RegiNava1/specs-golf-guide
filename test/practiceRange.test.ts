import assert from "node:assert/strict"
import test from "node:test"

import {DeterministicPuttingEngine} from "../src/puttingEngine.ts"
import {DeterministicStrokeModel} from "../src/strokeSimulation.ts"
import {
  CENTIMETERS_PER_FOOT,
  DEFAULT_PRACTICE_RANGE_DISTANCE_FT,
  getAdjacentPracticeRangeDistance,
  isPracticeRangeDistanceFt,
  practiceRangeFeetToCentimeters,
  PRACTICE_RANGE_DISTANCES_FT,
  resolvePracticeRangeLifecycleDistance,
} from "../lens-project/specs-golf-guide/Assets/GolfGuide/Scripts/PracticeRange.ts"

test("practice range exposes exactly the five approved foot distances", () => {
  assert.deepEqual(PRACTICE_RANGE_DISTANCES_FT, [5, 10, 15, 20, 25])
})

test("practice range defaults to 15 ft", () => {
  assert.equal(DEFAULT_PRACTICE_RANGE_DISTANCE_FT, 15)
})

test("all five presets convert to centimeters using exactly 30.48 cm per foot", () => {
  assert.equal(CENTIMETERS_PER_FOOT, 30.48)
  assert.deepEqual(
    PRACTICE_RANGE_DISTANCES_FT.map(practiceRangeFeetToCentimeters),
    [152.4, 304.8, 457.2, 609.6, 762]
  )
})

test("Quick Putt and unit-strength Stroke Practice use every selected nominal range", () => {
  for (const distanceFt of PRACTICE_RANGE_DISTANCES_FT) {
    const distanceCm = practiceRangeFeetToCentimeters(distanceFt)
    const setup = {
      ball: {x: 0, y: 0},
      target: {x: 0, y: distanceCm},
    }
    const quickPutt = new DeterministicPuttingEngine(setup).simulatePutt()
    const stroke = new DeterministicStrokeModel({
      ...setup,
      selectedAimDirection: {x: 0, y: 1},
    }).simulateStroke({direction: {x: 0, y: 1}, strength: 1})

    assert.deepEqual(quickPutt.endpoint, setup.target)
    assert.equal(quickPutt.classification, "On Target")
    assert.deepEqual(stroke.endpoint, setup.target)
    assert.equal(stroke.travelDistanceCm, distanceCm)
    assert.equal(stroke.distanceFeedback, "On Distance")
  }
})

test("practice range rejects unsupported and malformed distances", () => {
  for (const distance of PRACTICE_RANGE_DISTANCES_FT) {
    assert.equal(isPracticeRangeDistanceFt(distance), true)
  }

  for (const invalid of [0, 4, 6, 14, 16, 24, 26, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(isPracticeRangeDistanceFt(invalid), false)
  }
})

test("practice range stepping is exactly 5 ft and bounded", () => {
  assert.equal(getAdjacentPracticeRangeDistance(5, -1), null)
  assert.equal(getAdjacentPracticeRangeDistance(5, 1), 10)
  assert.equal(getAdjacentPracticeRangeDistance(15, -1), 10)
  assert.equal(getAdjacentPracticeRangeDistance(15, 1), 20)
  assert.equal(getAdjacentPracticeRangeDistance(25, -1), 20)
  assert.equal(getAdjacentPracticeRangeDistance(25, 1), null)
  assert.equal(getAdjacentPracticeRangeDistance(12, 1), null)
})

test("Retry Shot preserves range and Reset All restores 15 ft", () => {
  for (const distance of PRACTICE_RANGE_DISTANCES_FT) {
    assert.equal(
      resolvePracticeRangeLifecycleDistance(distance, "retry-shot"),
      distance
    )
  }
  assert.equal(resolvePracticeRangeLifecycleDistance(25, "reset-all"), 15)
  assert.equal(resolvePracticeRangeLifecycleDistance(12, "retry-shot"), 15)
})
