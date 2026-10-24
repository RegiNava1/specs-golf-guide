# SPECS Golf Guide — LEAF acceptance-test plan

## Status

This document is a plan only. No LEAF scenario has been written, installed, or executed, and no Lens Studio Preview validation has occurred. The names below identify planned scenarios and logical objects; they are not claims about the current Lens project.

The future test setup must use the SPECS 27 Interactive Preview and the officially supported CLAD/LEAF workflow. Automation may drive supported hand interactions and inspect exposed state or scene transforms once the implementation supplies stable selectors. Human Preview inspection remains required for scale, comfort, readability, and animation quality.

## Criterion 1 — Core scene and placement

**Planned scenario:** `criterion_1_core_scene_placement`

- **Initial state:** Fresh session or completed Reset Setup in `initial-placement`, with default ball `(0, 0)`, target `(0, 150)`, and aim `(0, 1)` in centimeters.
- **User interaction sequence:** Observe the initial arrangement; activate Move Setup; drag the placement handle by a known floor-plane offset; release; activate Confirm Placement.
- **Expected visible behavior:** A regulation-scale ball, a clearly larger 22.5 cm target zone, a distinct 10.8 cm hole, and a floor-anchored line are visible. The full arrangement moves together, remains aligned, and stops accepting placement changes after confirmation.
- **Expected reducer state:** `initial-placement` → `moving-setup` with the absolute offset → `aiming`. `startingBallPosition` and `targetPosition` gain the same offset, and their difference remains `(0, 150)`.
- **Pass/fail conditions:** Pass if all required objects are present, the measured ball/target translation matches the test offset within an implementation-defined Preview tolerance, relative geometry is unchanged, placement is confirmed, and placement controls hide. Fail on scale/position mismatch, relative drift, missing objects, or an incorrect phase.
- **Manual Preview limitations:** A person must judge convincing floor contact, real-world scale, depth readability, safe/reachable handle placement, and panel comfort at roughly waist height and 1–1.2 m distance.

## Criterion 2 — Explicit aim adjustment

**Planned scenario:** `criterion_2_adjust_aim`

- **Initial state:** Confirmed placement in `aiming`, with the ball and target positions recorded.
- **User interaction sequence:** Activate Adjust Aim; drag the aiming handle to a known leftward direction; observe; drag to a known rightward direction; finally restore direct alignment.
- **Expected visible behavior:** The aiming line and handle update immediately with each drag. The target zone and regulation hole remain fixed. Direct alignment is visually distinguishable.
- **Expected reducer state:** The phase remains `aiming`; each valid drag dispatches `ADJUST_AIM`, produces a normalized `aimDirection`, and leaves `targetPosition` unchanged.
- **Pass/fail conditions:** Pass if the line follows the expected normalized directions, left/right signs agree with the logic plane, the target does not translate, and malformed/zero-length input does not corrupt state. Fail if aim changes the target or produces a non-finite direction.
- **Manual Preview limitations:** A person must judge line clarity, immediate visual response, handle reachability, depth cues, and whether direct alignment is understandable without excess UI.

## Criterion 3 — Deterministic practice putt

**Planned scenario:** `criterion_3_deterministic_putt`

- **Initial state:** `aiming` with a recorded starting ball position, target, aim vector, and expected endpoint calculated by the pure engine.
- **User interaction sequence:** Activate Practice Putt; sample the ball at the beginning and midpoint; wait for the approved 1.5-second duration; observe completion. Reset to the same start/aim and repeat.
- **Expected visible behavior:** The ball moves smoothly from start to the deterministic endpoint while the target stays fixed. Rolling is visibly distinct from completed feedback. Any trail or line fade is subtle and does not change the endpoint.
- **Expected reducer state:** `aiming` → `rolling` after `PRACTICE_PUTT`, with `puttEndpoint` and `outcome` populated while `ballPosition` remains at start; then `result` after exactly one `COMPLETE_ROLL`, with `ballPosition` at the endpoint.
- **Pass/fail conditions:** Pass if the midpoint lies between start and endpoint, completion occurs within an agreed timing tolerance around 1.5 seconds, the final position matches the engine endpoint within spatial tolerance, and identical inputs produce identical endpoints. Fail on early feedback, target motion, nondeterminism, or phase collapse.
- **Manual Preview limitations:** A person must judge smoothness, visual speed, floor contact, trail/fade quality, and absence of distracting or misleading motion.

## Criterion 4 — Immediate outcome feedback

**Planned scenario:** `criterion_4_outcome_feedback`

- **Initial state:** Confirmed placement in `aiming`, with test directions known to produce a direct result, a left miss, and a right miss.
- **User interaction sequence:** Run a directly aligned putt; use Try Again; run the known left deviation; use Try Again; run the known right deviation.
- **Expected visible behavior:** No result appears during `rolling`. Immediately after completion, feedback near the target reads exactly `On Target`, `Missed Left`, or `Missed Right` as applicable. Success uses restrained positive treatment; miss feedback remains clear and neutral.
- **Expected reducer state:** Each cycle ends in `result` with `outcome.classification` matching the engine. The direct case is `On Target` based on the 22.5 cm practice zone, independent of whether the 10.8 cm regulation hole was entered.
- **Pass/fail conditions:** Pass if feedback timing and exact labels match reducer outcomes for all three cases and the practice-zone success threshold is not replaced by the hole radius. Fail on feedback during rolling, swapped left/right labels, stale feedback, or conflating `On Target` with `isInRegulationHole`.
- **Manual Preview limitations:** A person must judge feedback placement, readability, contrast, restrained celebration, and whether the target-zone/hole distinction is visually clear.

## Criterion 5 — Retry and complete reset

**Planned scenario:** `criterion_5_retry_reset_cycles`

- **Initial state:** `result` after a putt made with nondefault placement and aim.
- **User interaction sequence:** Activate Try Again; verify the restored ball and cleared feedback; make another putt; activate Try Again and complete another cycle; then activate Reset Setup.
- **Expected visible behavior:** Try Again restores the ball to the current translated start, clears result/trail visuals, and preserves placement and aim. Reset Setup restores the original arrangement and default line, clears all transient visuals, and shows initial placement controls.
- **Expected reducer state:** `result` → `aiming` on `TRY_AGAIN`, preserving `placementOffset`, `startingBallPosition`, `targetPosition`, and `aimDirection` while clearing endpoint/outcome. `RESET_SETUP` returns the full initial session with zero placement and default aim.
- **Pass/fail conditions:** Pass if at least two complete cycles run without stale visuals or state leakage, retry preserves the nondefault setup and aim, and reset restores every default. Fail on accumulated offsets, retained feedback, altered aim after retry, or incomplete reset.
- **Manual Preview limitations:** A person must judge transition polish, restored control visibility, handle reachability after reset, and any fading artifacts that state/transform assertions cannot assess.

## Planned coverage versus existing evidence

| Area | Current evidence | Future LEAF/Preview work |
| --- | --- | --- |
| Endpoint, thresholds, classifications, repeatability | Covered by Node unit tests | Confirm adapter coordinates and rendered endpoint. |
| Session transitions, invalid actions, retry/reset, multiple cycles | Covered by Node unit tests | Drive implemented controls and compare exposed/observable state. |
| Scene composition and placement | Not implemented | Build stable selectors, drive placement, inspect transforms, and perform manual scale/comfort review. |
| Aiming interaction | Reducer behavior is unit-tested | Drive the actual handle and inspect line/target transforms. |
| Rolling and feedback visuals | Timing/visual layer is not implemented | Measure the 1.5-second transition, verify feedback timing, and manually inspect motion/readability. |

Until those future scenarios are implemented and run, none of the five acceptance criteria should be reported as LEAF-passed.
