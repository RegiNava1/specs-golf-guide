# Virtual stroke integration preparation

## Scope and model assumptions

`src/strokeSimulation.ts` is a Lens-independent foundation for a simplified
virtual putting trainer. It does not model a physical club, measure a real
stroke, infer hand speed, or correct the player's input.

- The logic plane remains centimeters with `x` lateral and `y` forward.
- Stroke direction is a finite, nonzero player-controlled vector.
- Stroke strength is a deterministic distance multiplier. `1` travels the
  ball-to-target distance, `0` leaves the ball at rest, and values above `1`
  travel farther than the target. It is not a club-speed measurement.
- The endpoint is `ball + normalize(direction) * nominalDistance * strength`.
- `aimDeviation` compares the stroke path with the already selected aim.
- `distanceFeedback` compares the endpoint's forward position with the fixed
  target and the inclusive 22.5 cm practice-zone radius.
- `puttingOutcome` comes from the existing `DeterministicPuttingEngine` and
  retains its exact `On Target`, `Missed Left`, and `Missed Right` contract.
  Short/long feedback is supplemental and must not replace or reinterpret the
  existing label shown by the completed hackathon workflow.

## Batch 26 transient input contract

`src/strokeInputAdapter.ts` now implements the Lens-independent gesture state
machine proposed below. Its phases are `idle`, `addressed`, `backswing`,
`forward-stroke`, `impacted`, and `cancelled`.

- Input is only a sequence of 2D centimeter positions in the established
  floor logic plane. The adapter has no camera, head-pose, timing, or sensor
  input, so view motion cannot change a captured stroke.
- A gesture must address within 6 cm of the virtual ball, move at least 5 cm
  backward along the selected aim, then make at least 1 cm of forward progress.
- Virtual impact requires reaching the plane through the ball perpendicular to
  selected aim (with a 0.5 cm numerical tolerance) and at least 5 cm total
  backswing-to-impact displacement.
- Direction is the normalized vector from the farthest player-controlled
  backswing point to the player-controlled impact point. It is not copied from
  selected aim.
- Strength is `backswing-to-impact displacement / 30 cm`; therefore 15 cm,
  30 cm, and 45 cm map deterministically to strengths 0.5, 1, and 1.5.
  This remains gesture displacement, not measured club speed or physical swing
  strength.
- The adapter emits at most one result per gesture. Invalid values, incomplete
  forward movement, premature release, and explicit cancellation produce no
  model result. `resetInput()` clears all transient capture for retry.

## Smallest SIK-compatible interaction

The smallest future Lens adapter is one floor-constrained stroke handle near
the ball, using the same SIK mouse/pinch drag path already proven by the
placement and aiming handles.

1. Enter a separate virtual-stroke mode from the aiming phase and cache the
   current ball position, selected aim, target, and floor basis.
2. Show an approximately 12 cm handle behind the ball. On mouse/pinch grab,
   record its 2D floor position without changing reducer state.
3. Let the player pull the handle backward, then push it forward across the
   ball plane. Track the farthest backswing point and the final forward point.
4. On release, derive the stroke direction from the normalized vector between
   those two player-controlled points. Derive strength from the distance
   between them divided by a documented gesture-distance reference. Do not use
   frame timing, hand velocity, randomness, or automatic aim correction.
5. Send the direction and nonnegative strength to the pure stroke model. Keep
   the current hackathon `Practice Putt` action unchanged until a later batch
   explicitly chooses how stroke mode enters the existing session reducer.
6. Render path and distance coaching as additional training feedback while
   preserving the existing practice-zone result label verbatim.

The pure adapter now guards duplicate releases, rejects malformed or incomplete
gestures, and clears its transient backswing/forward state on retry or reset.
Exact SIK component selection, floor projection, and UI placement still require
a bounded Lens Studio Preview batch; no unverified API is prescribed here.

## Optional sway drill

A moving sway indicator can be explored later as an optional timing or path
drill. It must remain visually separate from the stroke handle, must never
choose the stroke direction for the player, and must not replace the direct
back-and-forward mouse/pinch interaction.

## Batch 27 recommendation

Prototype a separate Lens-side bridge in an isolated development scene or
prefab. It should project the already proven SIK mouse/pinch handle onto the
floor logic plane and call this adapter without altering the completed
submission controls. Do not connect it to the completed submission scene until
Preview regression evidence shows that all five existing criteria remain
intact.
