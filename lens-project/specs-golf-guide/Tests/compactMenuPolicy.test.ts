import assert from "node:assert/strict"
import test from "node:test"

import {getCompactMenuPresentation} from "../Assets/GolfGuide/Scripts/CompactMenuPolicy.ts"

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

test("aiming exposes Adjust Aim and Quick Putt", () => {
  assert.deepEqual(getCompactMenuPresentation("aiming").sideActions, [
    "adjust-aim",
    "quick-putt",
  ])
})

test("result keeps range read-only and exposes Retry and Reset All", () => {
  const result = getCompactMenuPresentation("result")
  assert.equal(result.rangeVisible, true)
  assert.equal(result.rangeEditable, false)
  assert.deepEqual(result.sideActions, ["retry", "reset-all"])
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
