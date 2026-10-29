# SPECS Golf Guide — Offline scene assembly handoff

**Status:** planning and reference assets only; no Lens Studio scene, LEAF selector, or interaction is implemented. The approved `devpost/design-brief.md` and `docs/lens-integration-contract.md` are authoritative.

## Proposed logical hierarchy (not existing editor objects)

```text
SpecsGolfGuide_Root
  PuttingSetup_Root             # the ONLY owner of placement translation
    Ball_Anchor
      GolfBall_Visual           # 4.3 cm sphere; center 2.15 cm above floor
      BallLocator_Visual
    Target_Anchor
      PracticeZone_Visual       # 22.5 cm diameter
      HoleMarker_Visual         # 10.8 cm diameter; distinct from success zone
    AimLine_Anchor
      AimLine_Visual            # start at ball; length = 150 cm initially
      AimArrow_Visual
    PlacementHandle_Anchor      # ~12 cm visual, placement only
    AimHandle_Anchor            # ~12 cm visual, aim-active only
    RollTrail_Visual            # optional; hidden until roll
  ControlPanel_Root             # independent of moving setup
    MoveSetup_Control
    ConfirmPlacement_Control
    AdjustAim_Control
    PracticePutt_Control
    TryAgain_Control
    ResetSetup_Control
  Feedback_Root
    Outcome_Text
    Guidance_Text
```

All labels are *proposed stable names*, **not verified Lens Studio objects or LEAF selectors**. Verify actual names/selectors during an authorized CLAD integration.

## Geometry and transform contract

- Logic plane axes: `x` increases right; `y` increases forward. Units are **cm**.
- Initial ball `(0,0)`, target/hole `(0,150)`, default aim `(0,1)`; ball about **80 cm ahead** of viewer, target about **230 cm ahead** (both require Preview verification).
- Ball diameter **4.3 cm**; regulation hole **10.8 cm**; practice-zone ring **22.5 cm**; handles approximately **12 cm**.
- Supply floor origin, orthonormal right and forward axes to `src/floorCoordinates.ts`. Do not assume tracked floor, editor coordinates, and camera axes coincide.
- Apply `placementOffset` only to `PuttingSetup_Root`. For children, use `setupLocalPoint(worldLogicPoint, placementOffset)` so translations are not doubled. Panel remains independent of the setup root.
- Lift the rendered ball center **2.15 cm** above the floor; keep its logical 2D position on the floor. Minor visual offsets to avoid z-fighting require Preview inspection.
- Keep the hole and practice zone stationary while adjusting aim; aim line follows normalized aim for the fixed initial **150 cm** putt travel.

## Offline reference artwork

- `assets/offline/putting-target.svg`: proportional 22.5 cm practice ring around a visually distinct 10.8 cm hole, expressed in a 225-unit viewBox.
- `assets/offline/interaction-handle.svg`: conceptual 12 cm interaction target.
- SVG dimensions express **reference proportions**, not confirmed centimeters after importing into Lens Studio. If SVG cannot be imported, recreate rings with simple CLAD-supported primitives.
- Use bright strokes on transparent backgrounds: the additive display can make dark content disappear.
- Use an actual 3D sphere for the ball and floor geometry for the aiming line; no requirement to import the reference SVG files.

## State/visibility binding

| Phase | Visible | Behavior |
|---|---|---|
| `initial-placement` | Ball, hole, zone, faint line, placement handle, guidance | Move Setup / Confirm Placement |
| `moving-setup` | Whole setup moves together | Dispatch `MOVE_SETUP` with absolute offset |
| `aiming` | Ball, fixed hole/zone, prominent aiming line | Adjust Aim / Practice Putt / Reset Setup |
| `aiming`, transient aim-active | Aiming handle near line end | `ADJUST_AIM`; target remains fixed |
| `rolling` | Ball interpolated; target/hole fixed; handles and result hidden | Cache start/endpoint and sample existing 1.5s roll; `COMPLETE_ROLL` once |
| `result` | Ball at endpoint, outcome near target | `Try Again` or `Reset Setup` |

The established reducer and `src/puttingInteraction.ts` govern valid actions; no replacement state machine should be invented inside the Lens controller. Feedback is precisely `On Target`, `Missed Left` or `Missed Right`. `On Target` means within practice zone, **not** holing the regulation putt.

## Prioritized authorized integration

1. Obtain the official supported CLAD editor workflow and verify the canonical project; **do not disable or bypass `isAuthorized`**.
2. Build root, sphere, ring, hole, and line; verify sizes, floor basis and visibility in SPECS 27 Interactive Preview. Criterion 1 remains incomplete until placement works.
3. Bind placement control and test criterion 1 through supported LEAF + manual Preview.
4. Bind aiming control and test criterion 2, checking target stability.
5. Bind rolling, feedback, retry and reset; validate criteria 3–5 separately.

## Validation boundary

Previously reported: 38 Node tests and browser prototype walkthrough passed in Batch 7. **This document and SVGs do not create a Lens or complete any LEAF acceptance criterion.** Actual component/material selection, import support, floor anchoring, readability, reachability, SIK/UI Kit binding, Preview and LEAF remain unverified.

No canonical `lens-project/` files, CLAD tooling, MCP authentication, paid services or publishing are part of this handoff.
