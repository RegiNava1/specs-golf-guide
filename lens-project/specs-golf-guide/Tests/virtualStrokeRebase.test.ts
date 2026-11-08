import assert from "node:assert/strict"
import test from "node:test"

import {VirtualStrokeInputAdapter} from "../../../src/strokeInputAdapter.ts"
import {DeterministicStrokeModel} from "../../../src/strokeSimulation.ts"

type Point = {x: number; y: number}

function unitDirection(from: Point, to: Point): Point {
  const x = to.x - from.x
  const y = to.y - from.y
  const length = Math.hypot(x, y)
  return {x: x / length, y: y / length}
}

function completeWeakStroke(ball: Point, target: Point): Point {
  const direction = unitDirection(ball, target)
  const model = new DeterministicStrokeModel({
    ball,
    target,
    selectedAimDirection: direction,
  })
  const adapter = new VirtualStrokeInputAdapter(model)
  const backswing = {
    x: ball.x - direction.x * 15,
    y: ball.y - direction.y * 15,
  }
  const forward = {
    x: ball.x - direction.x * 8,
    y: ball.y - direction.y * 8,
  }

  assert.equal(adapter.addressBall(ball), true)
  assert.equal(adapter.startBackswing(), true)
  assert.equal(adapter.trackBackswing(backswing), true)
  assert.equal(adapter.startForwardStroke(forward), true)
  assert.equal(adapter.trackForwardStroke(ball), true)
  const capture = adapter.completeStroke(ball)
  assert.ok(capture)
  return capture.outcome.endpoint
}

test("a second stroke addresses the rebased ball instead of the original anchor", () => {
  const originalBall = {x: 0, y: 0}
  const target = {x: 0, y: 457.2}
  const firstEndpoint = completeWeakStroke(originalBall, target)
  const direction = unitDirection(firstEndpoint, target)
  const secondModel = new DeterministicStrokeModel({
    ball: firstEndpoint,
    target,
    selectedAimDirection: direction,
  })
  const secondInput = new VirtualStrokeInputAdapter(secondModel)

  assert.equal(secondInput.addressBall(originalBall), false)
  assert.equal(secondInput.addressBall(firstEndpoint), true)
})

test("three consecutive manual strokes accept each previous endpoint as the new origin", () => {
  const target = {x: 12, y: 457.2}
  let ball = {x: 0, y: 0}

  for (let putt = 1; putt <= 3; putt += 1) {
    const endpoint = completeWeakStroke(ball, target)
    assert.notDeepEqual(endpoint, ball)
    ball = endpoint
  }
})

test("replay and reset origins remain valid for a fresh manual gesture", () => {
  const originalBall = {x: 0, y: 0}
  const target = {x: 0, y: 457.2}
  const firstEndpoint = completeWeakStroke(originalBall, target)

  const replayEndpoint = completeWeakStroke(originalBall, target)
  const resetEndpoint = completeWeakStroke(originalBall, target)

  assert.deepEqual(replayEndpoint, firstEndpoint)
  assert.deepEqual(resetEndpoint, firstEndpoint)
})
