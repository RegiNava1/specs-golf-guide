# SPECS Golf Guide — Lens integration contract

## Status and scope

This is a planning contract for a future Lens Studio adapter. It does not prescribe unverified Lens Studio APIs, components, packages, or gestures, and it does not change the Lens project. The existing pure TypeScript modules remain the source of truth for putting calculations and session transitions:

- `src/puttingEngine.ts`
- `src/puttingSession.ts`

All horizontal measurements are centimeters. The initial practice target is 22.5 cm in diameter, within the approved 20–25 cm range. The regulation hole is 10.8 cm in diameter and is visually distinct from the larger success zone; an `On Target` result does not mean that the ball entered the hole.

## Logical scene objects

These are object roles, not implementation-specific component names.

| Object | Required role and state binding |
| --- | --- |
| Setup root | Groups the floor-relative arrangement so placement can translate the ball, target, hole, line, and handles without changing their relative positions. |
| Virtual ball | Regulation-scale 4.3 cm diameter sphere. Its resting position follows `ballPosition`; its rolling visual is interpolated from the cached putt start to `puttEndpoint`. |
| Practice target | Visible 22.5 cm diameter floor zone centered on `targetPosition`. It defines `On Target`. |
| Regulation hole | 10.8 cm diameter marker centered inside the practice target. It communicates the real hole scale but does not replace the practice-zone threshold. |
| Aiming line | Floor-anchored line starting at `startingBallPosition`, pointing along `aimDirection`, and extending the fixed ball-to-target travel distance. |
| Placement handle | Approximately 12 cm wide, reachable near the ball, and visible only while the whole setup can be moved. |
| Aiming handle | Approximately 12 cm wide and placed near the far end of the aiming line while aim adjustment is active. |
| Control panel | Compact waist-height panel, about 1–1.2 m in front of the learner and slightly to one side. It exposes only actions valid for the current phase. |
| Feedback indicator | Result text and restrained success/miss treatment near the target. It remains hidden until the roll is completed. |

## Reducer phases and visible states

| Reducer phase | Visible state |
| --- | --- |
| `initial-placement` | Ball, target zone, regulation hole, subtle aiming line, placement handle, and placement guidance are visible. Move Setup and Confirm Placement are available. No result or trail is visible. |
| `moving-setup` | The same arrangement remains visible and translates as one unit. Relative ball, target, hole, and line geometry is unchanged. Placement controls remain available. |
| `aiming` | Placement UI is hidden. The ball, target, hole, and a prominent aiming line are visible. Adjust Aim, Practice Putt, and Reset Setup are available. The aiming handle is visible only while the UI's aim-adjustment mode is active. |
| `rolling` | The ball moves from its cached start to `puttEndpoint`; the target and hole stay fixed. Placement and aiming controls are inactive, and result feedback remains hidden until `COMPLETE_ROLL`. |
| `result` | The ball is at `puttEndpoint`. The exact reducer classification is displayed near the target. Try Again and Reset Setup are available; manipulation handles are hidden. |

`Adjust Aim` is an approved interaction, not a separate reducer phase. Whether the aiming handle is currently exposed is therefore transient adapter/UI state and must not change the reducer's deterministic phase model.

## Interaction-to-action mapping

| Approved interaction | Reducer action | Adapter responsibility |
| --- | --- | --- |
| Move Setup | `MOVE_SETUP` | Convert the placement handle's floor displacement to an absolute 2D `placementOffset`. Repeated updates move the complete arrangement while preserving relative positions. |
| Confirm Placement | `CONFIRM_PLACEMENT` | Dispatch once when confirmation is activated; hide placement controls after the reducer enters `aiming`. |
| Adjust Aim | `ADJUST_AIM` | Convert the handle position relative to the starting ball into a finite, nonzero direction. The reducer normalizes it; the target must not move. |
| Practice Putt | `PRACTICE_PUTT` | Dispatch once. Cache the returned start and endpoint for the visual roll while the reducer remains in `rolling`. |
| Roll finished | `COMPLETE_ROLL` | Dispatch exactly once after the 1.5-second visual roll completes. Do not display result feedback before this transition. |
| Try Again | `TRY_AGAIN` | Return the ball visual to `startingBallPosition`, clear roll/feedback visuals, and preserve placement and aim. |
| Reset Setup | `RESET_SETUP` | Restore the original arrangement and default aim, clear transient visuals, and return to initial placement. |

Invalid actions and malformed vectors are safely ignored by the reducer. The adapter must render the returned state and must not infer that a rejected action succeeded.

## Mapping the 2D logic plane to the Lens floor

The logic plane uses `x` for lateral displacement (positive right) and `y` for forward displacement. Lens Studio uses centimeters and a right-handed 3D coordinate system. A camera at identity faces world negative Z, but the adapter must not assume that a tracked floor or a rotated setup always shares world axes.

At placement time, define a floor origin `O`, a horizontal unit vector `R` pointing to the setup's right, and a horizontal unit vector `F` pointing along the setup's forward direction. Map a logic point `p` and direction `d` as:

```text
floorPoint(p) = O + R * p.x + F * p.y
floorDirection(d) = normalize(R * d.x + F * d.y)
```

The floor height is supplied by the future placement implementation and remains constant for the target, hole, line, and resting ball. Vertical lift needed to place the center of the 4.3 cm ball above the floor is a rendering offset, not part of the 2D engine.

To avoid applying placement twice, use one transform ownership model:

- The setup root receives `placementOffset` mapped through `R` and `F`.
- Children use setup-local coordinates derived by subtracting `placementOffset` from reducer positions. Thus the target remains at its initial local position, and the ball local position is `ballPosition - placementOffset`.
- Aim is mapped as a direction only; adjusting it never translates the target.

## Rolling and completion

After `PRACTICE_PUTT`, cache `start = ballPosition` before animation and `end = puttEndpoint` from the returned rolling state. For elapsed time `e`, use `t = clamp(e / 1.5 seconds, 0, 1)` and render the ball at the linear interpolation `start + (end - start) * t`. Do not recalculate the endpoint or dispatch intermediate reducer actions during animation.

At `t = 1`, dispatch `COMPLETE_ROLL` exactly once. The reducer then moves `ballPosition` to the endpoint and enters `result`. Visual spin, trail, or line fading may be layered on later, but they must not alter position, duration, classification, or reducer state.

## Feedback, retry, and reset

Feedback appears only in `result` and uses the exact classification: `On Target`, `Missed Left`, or `Missed Right`. `On Target` is determined by the 22.5 cm practice zone. The separately calculated regulation-hole flag may support a future visual detail, but it must not relabel or narrow the approved success result.

`TRY_AGAIN` restores the ball to the translated starting position, clears the endpoint, outcome, trail, and feedback, returns to `aiming`, and preserves the current setup placement and aim. `RESET_SETUP` clears all transient visuals and restores the initial ball at `(0, 0)`, target at `(0, 150)`, placement offset `(0, 0)`, and default aim `(0, 1)` in logic coordinates.

## Validation boundary

Already validated by the Node tests:

- fixed-distance endpoint calculation, direct alignment, deliberate left/right misses, target-zone boundary behavior, and repeatability;
- separation of the practice target zone from the regulation hole;
- placement translation, target stability during aim adjustment, rolling/result separation, retry/reset behavior, invalid-action handling, and repeated cycles without state leakage.

Still requiring Lens Studio Preview and planned LEAF verification:

- floor anchoring, real-world scale, hierarchy/transform mapping, render order, and comfort/readability;
- actual hand interactions, reachable handles, control availability, and invalid-input behavior at the adapter boundary;
- smooth 1.5-second movement, line/trail transitions, result timing, and visual restoration across repeated cycles;
- final object names, scene hierarchy, components, materials, packages, and supported APIs selected through the official CLAD workflow.

## Unresolved integration decisions

- The exact scene hierarchy, Lens components, materials, and interaction components must be selected and verified in the supported Lens Studio version.
- The authored floor origin and forward basis must be established during scene construction and verified in Preview.
- The UI-local activation behavior for the aiming handle is not represented in the reducer and needs a bounded adapter decision.
- The visual easing, spin, and subtle trail/fade treatment need Preview evaluation; only the 1.5-second duration and deterministic endpoints are fixed.
- LEAF selectors and scenario object names cannot be finalized until scene objects exist.
