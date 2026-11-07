# Multi-putt session design

Status: future design only. This document does not change the current single-shot gameplay.

## Session behavior

- A completed virtual stroke leaves the ball at its deterministic endpoint.
- `Next Putt` starts from that endpoint; it does not return the ball to the session's original start.
- The hole and practice target remain fixed for the whole session.
- The session tracks total completed putts and the horizontal ball-to-hole distance remaining.
- `Replay Shot` restores the ball to the start of the most recent putt, preserving the session start, fixed hole, selected range and aim used for that putt.
- `Reset Session` restores the original station placement, default aim, 15 ft range, ball start and a putt count of zero.

These actions are intentionally separate:

| Action | Ball position | Hole | Putt count | Aim/range |
| --- | --- | --- | --- | --- |
| Next Putt | Previous endpoint becomes the new start | Fixed | Preserved | Re-aim from the new ball position; range remains the session setting |
| Replay Shot | Restores the previous putt's start | Fixed | Does not add a putt until the replay completes | Restores that putt's aim and range |
| Reset Session | Restores the original session start | Fixed original position | Resets to zero | Default aim and 15 ft |

## Success semantics

The existing 22.5 cm practice target zone remains a training threshold. `On Target` means the endpoint is inside that zone; it does not mean the ball entered the 10.8 cm regulation hole.

A genuinely holed putt requires a separate deterministic condition based on the ball endpoint relative to the regulation hole radius. The future state model must store `targetZoneResult` and `isHoled` separately so UI, coaching and session completion cannot conflate them.

## Deterministic state changes

The session reducer will need to add:

- `sessionStartBallPosition`, `currentPuttStartPosition` and `ballPosition`.
- A fixed `holePosition` independent of the current ball and aim guide.
- `completedPutts`, `remainingDistanceCm`, `lastCompletedPutt` and `isHoled`.
- A ready-for-next-putt phase distinct from the current result phase.
- `NEXT_PUTT`, `REPLAY_SHOT` and `RESET_SESSION` actions with explicit phase guards.

The Lens controller will need to:

- Rebase the aiming guide and stroke handle on `currentPuttStartPosition` after `NEXT_PUTT`.
- Leave the hole and target transforms unchanged between putts.
- Preserve the previous putt snapshot until the next putt completes or the session resets.
- Update the compact menu with putt count and remaining distance without adding another floating panel.
- Keep rolling, feedback and Ghost Coach lifecycle behavior phase-driven.

No randomness, hidden correction, real-world sensing or physical-club tracking is introduced. Endpoint, remaining distance and hole checks remain pure centimeter-based calculations.

## Required tests before implementation

- A completed stroke becomes the next putt's exact starting position.
- The hole remains fixed across multiple left, right, short, long and overshot putts.
- Putt count increments exactly once per completed roll and never on invalid or duplicate actions.
- Remaining horizontal distance is correct after direct, lateral and overshot endpoints.
- Replay restores only the most recent putt start and does not leak prior feedback or trail state.
- Reset restores the original start, zero count, default aim and 15 ft range.
- Target-zone success and `isHoled` are independently classified at their boundaries.
- Multiple complete sessions have no state leakage.
- Existing placement, Quick Putt, Stroke Practice, Ghost Coach, Retry and Reset All behavior remains covered until the multi-putt workflow intentionally replaces the relevant controls.

Preview validation will still be required for ball persistence, re-anchored controls, fixed-hole rendering, readable session counters and repeated SIK interaction cycles.
