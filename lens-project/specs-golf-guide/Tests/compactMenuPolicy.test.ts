import assert from "node:assert/strict"
import test from "node:test"

import {
  getCompactMenuPresentation,
  getManualStrokeActionLabel,
} from "../Assets/GolfGuide/Scripts/CompactMenuPolicy.ts"

test("placement exposes range and Lock without Move or navigation recovery", () => {
  assert.deepEqual(getCompactMenuPresentation("placement"), {
    visible: true,
    rangeVisible: true,
    rangeEditable: true,
    centerAction: "lock",
    sideActions: [],
    instruction: "Drag + to place",
  })
})

test("aiming exposes manual Stroke Putt separately from Quick Putt", () => {
  const aiming = getCompactMenuPresentation("aiming")
  assert.equal(aiming.rangeEditable, false)
  assert.equal(aiming.centerAction, "stroke-putt")
  assert.deepEqual(aiming.sideActions, [
    "adjust-aim",
    "quick-putt",
  ])
})

test("manual stroke action distinguishes first and later putts", () => {
  assert.equal(getManualStrokeActionLabel(0), "Stroke Putt")
  assert.equal(getManualStrokeActionLabel(1), "Putt Again")
  assert.equal(getManualStrokeActionLabel(4), "Putt Again")
})

test("result exposes Next Putt, Replay Shot, and Reset Session", () => {
  const result = getCompactMenuPresentation("result")
  assert.equal(result.rangeVisible, true)
  assert.equal(result.rangeEditable, false)
  assert.equal(result.centerAction, "reset-session")
  assert.deepEqual(result.sideActions, ["next-putt", "replay-shot"])
})

test("holed completion exposes only New Session", () => {
  const holed = getCompactMenuPresentation("holed")
  assert.equal(holed.rangeVisible, true)
  assert.equal(holed.rangeEditable, false)
  assert.equal(holed.centerAction, "new-session")
  assert.deepEqual(holed.sideActions, [])
})

test("rolling is the only phase with no menu", () => {
  assert.deepEqual(getCompactMenuPresentation("rolling"), {
    visible: false,
    rangeVisible: false,
    rangeEditable: false,
    centerAction: null,
    sideActions: [],
    instruction: null,
  })
})
