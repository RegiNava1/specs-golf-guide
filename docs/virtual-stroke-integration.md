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

The adapter should guard duplicate releases, ignore malformed or incomplete
gestures, and clear its transient backswing/forward state on retry or reset.
Exact SIK component selection, floor projection, gesture-distance reference,
and UI placement require a bounded Lens Studio Preview batch; no unverified API
is prescribed here.

## Optional sway drill

A moving sway indicator can be explored later as an optional timing or path
drill. It must remain visually separate from the stroke handle, must never
choose the stroke direction for the player, and must not replace the direct
back-and-forward mouse/pinch interaction.

## Batch 26 recommendation

Prototype only the transient stroke-handle adapter in an isolated Lens scene or
feature branch. First validate direct mouse/pinch control, deterministic input
capture, invalid-release handling, and coexistence with the current aiming
workflow. Do not connect it to the completed submission scene until Preview
regression evidence shows that all five existing criteria remain intact.
