# SPECS Golf Guide — Canonical visual asset specification v1.0

**Status: approved-brief-aligned reference specification; NOT a completed Lens Studio implementation.** The approved `devpost/design-brief.md` takes precedence if conflicts are found. This document freezes defaults for consistent authoring; adjustments for readability/interaction in actual Preview must be documented and verified.

## Identity and appearance

- Design language: **recognizable realistic golf equipment plus minimal high-contrast AR guides**. No cartoon transformations, elaborate green/course scenery, advertising, or full-screen HUD.
- The world floor is the primary ground. Virtual objects are floor-relative and never scale dynamically with distance; the viewer moves around fixed real-world-size content.
- Colour tokens (sRGB reference values, not guaranteed appearance on additive displays): guidance cyan `#67E9FF`, high-contrast white `#F4FFFF`, success teal `#3BE3A2`, miss coral `#FF786E`, neutral secondary `#AFC4CC`. All materials must be Preview-tested; don't rely on dark colours or solid black for visible content.
- Transparent backgrounds for guides; thin lines and readable type; soft glow only as supplemental contrast. Avoid a full opaque green plane.
- Dimensions are physical **centimetres**, not pixels. Importing an SVG/texture does not itself guarantee a physical scale.

## Canonical items

| ID / proposed editor name | Geometry, size, positioning | Material and appearance | Behaviour |
| --- | --- | --- | --- |
| `GOLF_BALL_001` / `GolfBall_Visual` | 3D sphere, diameter **4.3 cm**, radius 2.15 cm; resting center 2.15 cm above floor | Neutral off-white body; subtle golf dimples if performant; diffuse-to-low satin highlight; no logos or random markings | Translate to calculated endpoint during fixed 1.5 s roll; optional spin must not affect position or outcome. Keep diameter constant |
| `HOLE_MARKER_001` / `HoleMarker_Visual` | Floor marker, diameter **10.8 cm**, concentric at target; thin rim and dark-looking central depth cue *only if visually legible* | Thin white/light rim; centre may be transparent or muted contrasting tone; no claim of physical floor excavation | Stationary during aim/roll; never used as the On Target threshold |
| `PRACTICE_ZONE_001` / `PracticeZone_Visual` | Floor ring, diameter **22.5 cm** (brief allows 20–25 cm); same centre as hole | Cyan outline on transparent floor, optional subtle low-opacity wash; visual separation from hole | Success uses circle radius **11.25 cm** from final endpoint |
| `AIM_GUIDE_001` / `AimLine_Visual` | Thin floor-level line from ball along normalized aim for initial **150 cm** travel; small end-direction arrow | Cyan guidance, stronger during aim, subdued during roll; reference stroke approx 0.7–1.2 cm subject to Preview | Pivots about ball; **never moves target**; endpoint cannot be silently redirected toward hole |
| `BALL_LOCATOR_001` / `BallLocator_Visual` | Subtle ring near ball; initial suggestion ~7 cm outer diameter, not acceptance-critical | Thin light cyan outline; not a second hole | Visible in placement/aim only; may fade during roll |
| `PLACE_HANDLE_001` / `PlacementHandle_Anchor` | Approx **12 cm** forgiving target near ball | Cyan outlined interaction reticle, distinct hover highlight | Visible/active only in placement; moves whole setup with fixed relative geometry |
| `AIM_HANDLE_001` / `AimHandle_Anchor` | Approx **12 cm** target near end of aiming line | Same reticle style; slightly brighter in aim-adjust mode | Can drag aim direction only; fixed hole/zone; hidden outside aim-active mode |
| `CONTROL_PANEL_001` / `ControlPanel_Root` | Compact, reachable at ~**1–1.2 m** from viewer and near waist height, slightly offset from line | Light readable buttons; high contrast on additive display | Move Setup, Confirm Placement, Adjust Aim, Practice Putt, Try Again, Reset Setup; display only phase-appropriate actions |
| `FEEDBACK_001` / `Outcome_Text` | Small label near target, readable from standing position | Literal `On Target` (teal), `Missed Left` and `Missed Right` (coral or neutral); high-contrast text | Hidden through roll, shown after `COMPLETE_ROLL`; no random feedback |
| `GROUND_001` / environment | **Existing simulated/real flat floor**, not a giant synthetic green | No generated opaque floor; if unavoidable use only a subtle translucent contact decal | Remains static; do not pretend automatic real-world floor detection is implemented |
| `FLAG_OPTIONAL_001` / `FlagMarker_Optional` | **Not required by approved brief; disabled by default**. If later approved, slender marker placed without obstructing cup or aiming line; no fixed height established | White/light pole and small cyan pennant; minimalist | Purely decorative; never blocks interaction or defines aim/outcome |

## Fixed layout

- Initial logical ball `(0, 0)`, target `(0, 150)` in cm; viewer approx 80 cm behind ball. All targets share `targetPosition`.
- Floor coordinate basis comes from `src/floorCoordinates.ts`; never hardcode world-axis orientation before Preview verification.
- One owner of placement translation: `PuttingSetup_Root`; children use setup-local positions.
- Ball is physically 3D, hole and target are floor-level geometry/overlays. Reference artwork does **not** replace world-anchored geometry.

## Visual state matrix

| Phase | Ball | Hole & practice zone | Aim line | Handles | Outcome |
| --- | --- | --- | --- | --- | --- |
| Initial placement / moving setup | fixed to moving setup | move together | faint, together | placement handle | hidden |
| Aiming | stationary | stationary | clear and directional | aim handle only when aim-active | hidden |
| Rolling | interpolated over 1.5 s | stationary | faint / optional trail | hidden | hidden |
| Result | at endpoint | stationary | subdued | hidden | visible |
| Try Again | restored to start | preserved | prominent | aim as selected | cleared |
| Reset Setup | original ball | original zone and hole | default aim | placement | cleared |

Transitions may use brief 0.2–0.4 s fades where practical, including reduced-motion-friendly fallbacks. No visual effect may alter simulation endpoint/classification.

## Versioning and production rules

1. Treat `assets/offline/putting-target.svg` and `assets/offline/interaction-handle.svg` as the original proportional references. New `assets/canonical/` files are authoring references, not proof of supported Lens import.
2. `assets/canonical/visual-asset-manifest.json` holds the machine-readable measured defaults and paths.
3. For future geometry/texture generation, match **identifier, diameter, colour token and behavior**. Variations must be recorded here before re-authoring.
4. Use native simple Lens geometry when practical; keep textures lightweight. Verify whether SVG import is supported rather than assuming it.
5. Avoid logos, third-party IP, secrets, AI-generated illegible labels and unreviewed extra scenery.
6. Do not add the optional flag as a required object. The approved experience is valid with **no flag**.
7. During authorized integration, verify in SPECS 27 Interactive Preview: physical sizes, readable contrast, floor contact/z-fighting, aim stability, reachability, UI visibility, and 1.5 s motion. All five LEAF criteria remain outstanding.
