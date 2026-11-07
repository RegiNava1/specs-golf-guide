import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateDistanceToHole,
  formatDistanceToHoleFeet,
  type WorldPointCm,
} from "../Assets/GolfGuide/Scripts/DistanceToHole.ts"
import {
  DEFAULT_PRACTICE_RANGE_DISTANCE_FT,
  PRACTICE_RANGE_DISTANCES_FT,
  practiceRangeFeetToCentimeters,
} from "../Assets/GolfGuide/Scripts/PracticeRange.ts"

const point = (x: number, z: number, y = 0): WorldPointCm => ({x, y, z})

test("all five starting ranges report their actual horizontal distance", () => {
  for (const rangeFeet of PRACTICE_RANGE_DISTANCES_FT) {
    const result = calculateDistanceToHole(
      point(0, 0),
      point(0, -practiceRangeFeetToCentimeters(rangeFeet))
    )
    assert.ok(result)
    assert.equal(result.centimeters, practiceRangeFeetToCentimeters(rangeFeet))
    assert.equal(result.feet, rangeFeet)
    assert.equal(formatDistanceToHoleFeet(result.feet), `${rangeFeet.toFixed(1)} ft`)
  }
})

test("directly aligned, short, and overshot endpoints use positions rather than shot subtraction", () => {
  const hole = point(0, -practiceRangeFeetToCentimeters(15))
  const short = calculateDistanceToHole(point(0, -300), hole)
  const overshot = calculateDistanceToHole(point(0, -600), hole)
  const aligned = calculateDistanceToHole(hole, hole)

  assert.ok(short)
  assert.ok(overshot)
  assert.ok(aligned)
  assert.equal(short.centimeters, 157.2)
  assert.equal(overshot.centimeters, 142.8)
  assert.equal(aligned.centimeters, 0)
})

test("left and right misses produce the same lateral remaining distance", () => {
  const hole = point(0, -457.2)
  const left = calculateDistanceToHole(point(-30, -457.2), hole)
  const right = calculateDistanceToHole(point(30, -457.2), hole)

  assert.ok(left)
  assert.ok(right)
  assert.equal(left.centimeters, 30)
  assert.equal(right.centimeters, 30)
})

test("diagonal displacement uses Euclidean ground-plane distance", () => {
  const result = calculateDistanceToHole(point(0, 0), point(30, -40))
  assert.ok(result)
  assert.equal(result.centimeters, 50)
  assert.equal(formatDistanceToHoleFeet(result.feet), "1.6 ft")
})

test("world height does not change the horizontal distance", () => {
  const result = calculateDistanceToHole(point(0, 0, 2.15), point(30, -40, -8))
  assert.ok(result)
  assert.equal(result.centimeters, 50)
})

test("non-finite coordinates and missing geometry fail safely", () => {
  assert.equal(calculateDistanceToHole(point(Number.NaN, 0), point(0, 0)), null)
  assert.equal(calculateDistanceToHole(point(0, 0), point(0, Infinity)), null)
  assert.equal(calculateDistanceToHole(point(0, 0, Number.NaN), point(0, 0)), null)
  assert.equal(calculateDistanceToHole(null, point(0, 0)), null)
  assert.equal(formatDistanceToHoleFeet(Number.NaN), "—")
  assert.equal(formatDistanceToHoleFeet(null), "—")
})

test("retry restores the shot start distance and Reset All restores the 15 ft default", () => {
  const shotStart = point(12, -25)
  const hole = point(12, -25 - practiceRangeFeetToCentimeters(20))
  const completedEndpoint = point(42, hole.z + 60)

  const completed = calculateDistanceToHole(completedEndpoint, hole)
  const retry = calculateDistanceToHole(shotStart, hole)
  const reset = calculateDistanceToHole(
    point(0, 0),
    point(
      0,
      -practiceRangeFeetToCentimeters(DEFAULT_PRACTICE_RANGE_DISTANCE_FT)
    )
  )

  assert.ok(completed)
  assert.ok(retry)
  assert.ok(reset)
  assert.notEqual(completed.feet, retry.feet)
  assert.equal(retry.feet, 20)
  assert.equal(reset.feet, DEFAULT_PRACTICE_RANGE_DISTANCE_FT)
})
