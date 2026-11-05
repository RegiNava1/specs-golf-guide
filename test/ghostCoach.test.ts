import assert from "node:assert/strict"
import test from "node:test"

import {createGhostCoachFeedback} from "../lens-project/specs-golf-guide/Assets/GolfGuide/Scripts/GhostCoach.ts"

test("Ghost Coach celebrates an on-target manual stroke", () => {
  const feedback = createGhostCoachFeedback({
    classification: "On Target",
    aimDeviation: "Aligned",
    distanceFeedback: "On Distance",
    selectedDistanceCm: 150,
    travelDistanceCm: 150,
  })

  assert.equal(feedback.classification, "On Target")
  assert.equal(feedback.outcome, "On Target")
  assert.match(feedback.tip, /repeat that stroke/i)
  assert.match(feedback.actualPath, /↑/)
})

test("Ghost Coach distinguishes left and right stroke paths", () => {
  const left = createGhostCoachFeedback({
    classification: "Missed Left",
    aimDeviation: "Left of Aim",
    distanceFeedback: "On Distance",
    selectedDistanceCm: 100,
    travelDistanceCm: 100,
  })
  const right = createGhostCoachFeedback({
    classification: "Missed Right",
    aimDeviation: "Right of Aim",
    distanceFeedback: "On Distance",
    selectedDistanceCm: 100,
    travelDistanceCm: 100,
  })

  assert.match(left.tip, /went left/i)
  assert.equal(left.outcome, "Missed Left")
  assert.match(left.actualPath, /↖/)
  assert.match(right.tip, /went right/i)
  assert.equal(right.outcome, "Missed Right")
  assert.match(right.actualPath, /↗/)
})

test("Ghost Coach distinguishes short and long aligned strokes", () => {
  const short = createGhostCoachFeedback({
    classification: "Missed Right",
    aimDeviation: "Aligned",
    distanceFeedback: "Short",
    selectedDistanceCm: 75,
    travelDistanceCm: 40,
  })
  const long = createGhostCoachFeedback({
    classification: "Missed Right",
    aimDeviation: "Aligned",
    distanceFeedback: "Long",
    selectedDistanceCm: 75,
    travelDistanceCm: 110,
  })

  assert.match(short.tip, /Finished short/i)
  assert.equal(short.outcome, "Too Short")
  assert.match(short.summary, /40\/75 cm/)
  assert.match(long.tip, /Finished long/i)
  assert.equal(long.outcome, "Too Long")
  assert.match(long.summary, /110\/75 cm/)
  assert.ok(short.actualPath.length < long.actualPath.length)
})

test("Ghost Coach output is deterministic and rejects malformed distances", () => {
  const input = {
    classification: "Missed Left" as const,
    aimDeviation: "Left of Aim" as const,
    distanceFeedback: "Short" as const,
    selectedDistanceCm: 125,
    travelDistanceCm: 81.25,
  }
  assert.deepEqual(
    createGhostCoachFeedback(input),
    createGhostCoachFeedback(input)
  )
  assert.throws(() =>
    createGhostCoachFeedback({...input, selectedDistanceCm: Number.NaN})
  )
})
