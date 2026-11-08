import assert from "node:assert/strict"
import test from "node:test"

import {
  REGULATION_HOLE_RADIUS_CM,
  createMultiPuttSession,
  transitionMultiPuttSession,
  type GroundDirection,
  type MultiPuttSessionState,
  type TargetZoneResult,
} from "../Assets/GolfGuide/Scripts/MultiPuttSession.ts"
import {calculateDistanceToHole} from "../Assets/GolfGuide/Scripts/DistanceToHole.ts"
import {
  PRACTICE_RANGE_DISTANCES_FT,
  practiceRangeFeetToCentimeters,
} from "../Assets/GolfGuide/Scripts/PracticeRange.ts"

const aim: GroundDirection = {x: 0, z: -1}
const point = (x: number, z: number, y = 0) => ({x, y, z})

function createSession(rangeFeet = 15): MultiPuttSessionState {
  const distanceCm = practiceRangeFeetToCentimeters(rangeFeet)
  return createMultiPuttSession({
    ballPosition: point(0, 0),
    holePosition: point(0, -distanceCm),
    defaultAimDirection: aim,
    nominalDistanceCm: distanceCm,
    startPhase: "aiming",
  }, calculateDistanceToHole)
}

const transition = (
  state: MultiPuttSessionState,
  action: Parameters<typeof transitionMultiPuttSession>[1]
) => transitionMultiPuttSession(state, action, calculateDistanceToHole)

function completePutt(
  state: MultiPuttSessionState,
  endpoint: ReturnType<typeof point>,
  targetZoneResult: TargetZoneResult = "Missed Right"
): MultiPuttSessionState {
  const rolling = transition(state, {
    type: "START_ROLL",
    endpoint,
    aimDirection: aim,
    nominalDistanceCm: state.currentNominalDistanceCm,
    targetZoneResult,
    source: "virtual-stroke",
  })
  return transition(rolling, {type: "COMPLETE_ROLL"})
}

test("first putt stops short and the second holes from the persisted endpoint", () => {
  const initial = createSession()
  const first = completePutt(initial, point(0, -400))

  assert.equal(first.phase, "result")
  assert.equal(first.completedPutts, 1)
  assert.deepEqual(first.ballPosition, point(0, -400))
  assert.ok(Math.abs(first.remainingDistanceCm - 57.2) < 1e-9)

  const next = transition(first, {type: "NEXT_PUTT"})
  assert.deepEqual(next.currentPuttStartPosition, first.ballPosition)
  assert.ok(Math.abs(next.currentNominalDistanceCm - 57.2) < 1e-9)

  const second = completePutt(next, point(0, -457.2), "On Target")
  assert.equal(second.phase, "holed")
  assert.equal(second.completedPutts, 2)
  assert.equal(second.remainingDistanceCm, 0)
  assert.equal(second.isHoled, true)
})

test("three-putt sequence keeps the hole fixed and has no state leakage", () => {
  const hole = point(0, -457.2)
  let state = createSession()
  state = completePutt(state, point(-40, -250), "Missed Left")
  state = transition(state, {type: "NEXT_PUTT"})
  state = completePutt(state, point(25, -420), "Missed Right")
  state = transition(state, {type: "NEXT_PUTT"})
  state = completePutt(state, hole, "On Target")

  assert.equal(state.phase, "holed")
  assert.equal(state.completedPutts, 3)
  assert.deepEqual(state.holePosition, hole)
})

test("lateral and overshot endpoints use actual horizontal distance", () => {
  const lateral = completePutt(createSession(), point(30, -457.2))
  const overshot = completePutt(createSession(), point(0, -600))

  assert.equal(lateral.remainingDistanceCm, 30)
  assert.equal(overshot.remainingDistanceCm, 142.8)
})

test("the regulation hole boundary is inclusive", () => {
  const state = createSession()
  const holeZ = state.holePosition.z
  const boundary = completePutt(
    state,
    point(REGULATION_HOLE_RADIUS_CM, holeZ),
    "On Target"
  )
  assert.equal(boundary.isHoled, true)
  assert.equal(boundary.phase, "holed")
})

test("On Target inside the 22.5 cm practice zone is not necessarily holed", () => {
  const state = createSession()
  const endpoint = point(8, state.holePosition.z)
  const result = completePutt(state, endpoint, "On Target")

  assert.equal(result.targetZoneResult, "On Target")
  assert.equal(result.isHoled, false)
  assert.equal(result.phase, "result")
})

test("duplicate completion and invalid phase actions are safely ignored", () => {
  const initial = createSession()
  const invalidNext = transition(initial, {type: "NEXT_PUTT"})
  assert.equal(invalidNext, initial)

  const result = completePutt(initial, point(0, -300))
  const duplicate = transition(result, {type: "COMPLETE_ROLL"})
  assert.equal(duplicate, result)
  assert.equal(duplicate.completedPutts, 1)
})

test("malformed roll inputs never corrupt the session", () => {
  const initial = createSession()
  const invalidEndpoint = transition(initial, {
    type: "START_ROLL",
    endpoint: point(Number.NaN, 0),
    aimDirection: aim,
    nominalDistanceCm: initial.currentNominalDistanceCm,
    targetZoneResult: "Missed Right",
    source: "quick-putt",
  })
  const invalidDirection = transition(initial, {
    type: "START_ROLL",
    endpoint: point(0, -100),
    aimDirection: {x: 0, z: 0},
    nominalDistanceCm: initial.currentNominalDistanceCm,
    targetZoneResult: "Missed Right",
    source: "quick-putt",
  })
  assert.equal(invalidEndpoint, initial)
  assert.equal(invalidDirection, initial)
})

test("aim updates are normalized only while aiming", () => {
  const initial = createSession()
  const aimed = transition(initial, {
    type: "SET_AIM",
    aimDirection: {x: 3, z: -4},
  })
  assert.deepEqual(aimed.aimDirection, {x: 0.6, z: -0.8})

  const rolling = transition(aimed, {
    type: "START_ROLL",
    endpoint: point(0, -100),
    aimDirection: aimed.aimDirection,
    nominalDistanceCm: aimed.currentNominalDistanceCm,
    targetZoneResult: "Missed Right",
    source: "quick-putt",
  })
  assert.equal(
    transition(rolling, {type: "SET_AIM", aimDirection: aim}).aimDirection,
    rolling.aimDirection
  )
})

test("an unholed completion remains in result until Next Putt is explicit", () => {
  const result = completePutt(createSession(), point(0, -300), "On Target")
  assert.equal(result.phase, "result")
  assert.equal(result.completedPutts, 1)

  const ignoredAim = transition(result, {
    type: "SET_AIM",
    aimDirection: {x: 1, z: 0},
  })
  assert.equal(ignoredAim, result)
  assert.equal(ignoredAim.phase, "result")

  const next = transition(result, {type: "NEXT_PUTT"})
  assert.equal(next.phase, "aiming")
  assert.deepEqual(next.currentPuttStartPosition, result.ballPosition)
})

test("Replay Shot restores only the most recent start and rolls back its count", () => {
  const first = completePutt(createSession(), point(20, -320), "Missed Right")
  const next = transition(first, {type: "NEXT_PUTT"})
  const second = completePutt(next, point(-15, -410), "Missed Left")
  const replay = transition(second, {type: "REPLAY_SHOT"})

  assert.equal(replay.phase, "aiming")
  assert.equal(replay.completedPutts, 1)
  assert.deepEqual(replay.ballPosition, first.ballPosition)
  assert.deepEqual(replay.currentPuttStartPosition, first.ballPosition)
  assert.equal(replay.targetZoneResult, null)
})

test("Reset Session restores the original session without leaking prior results", () => {
  const completed = completePutt(createSession(), point(30, -300))
  const reset = transition(completed, {type: "RESET_SESSION"})

  assert.equal(reset.phase, "placement")
  assert.equal(reset.completedPutts, 0)
  assert.deepEqual(reset.ballPosition, reset.originalStartPosition)
  assert.equal(reset.currentNominalDistanceCm, practiceRangeFeetToCentimeters(15))
  assert.equal(reset.targetZoneResult, null)
  assert.equal(reset.lastCompletedPutt, null)
})

test("all five Practice Range starts initialize deterministically", () => {
  for (const rangeFeet of PRACTICE_RANGE_DISTANCES_FT) {
    const first = createSession(rangeFeet)
    const second = createSession(rangeFeet)
    assert.equal(first.remainingDistanceCm, practiceRangeFeetToCentimeters(rangeFeet))
    assert.deepEqual(first, second)
  }
})

test("separate sessions do not leak transitions", () => {
  const first = createSession()
  const second = createSession()
  const completedFirst = completePutt(first, point(99, -200))
  assert.equal(completedFirst.ballPosition.x, 99)
  assert.equal(second.ballPosition.x, 0)
  assert.equal(second.completedPutts, 0)
})
