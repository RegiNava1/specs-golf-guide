# SPECS Golf Guide — Project state

As of 2026-10-28
Repository: `RegiNava1/specs-golf-guide`
Branch: `main`
Status: Official planning brief approved; standalone deterministic putting engine, session state machine, floor mapping, roll interpolation, and offline interaction adapter validated; future Lens integration and LEAF acceptance coverage documented; no Lens scene implementation has started.

## Verified
- Separate RegiNava1 GitHub connection is usable for this repository.
- Repository is private, default branch `main`, and read/write rights available under that identity.
- SECURITY_BOUNDARIES.md and DEVELOPMENT_RULES.md created with direct GitHub commits.
- Foundational documents are being added as a deliberately small documentation sequence.
- Codex working directory verified as the canonical Lens Studio project folder: `lens-project/specs-golf-guide`.
- Canonical project verified as `lens-project/specs-golf-guide/specs-golf-guide.esproj` and matched to the active Lens Studio project through a read-only Editor API query.
- Lens Studio 5.24.1 MCP connection verified with `ListAllPanels` and `ExecuteEditorCode`.
- Official `plan-lens` skill and CLAD tooling verified as available. The local `plan-lens` instructions match the official upstream workflow inspected on 2026-10-17.
- Official learner-led planning interview completed and `devpost/design-brief.md` approved.
- Standalone deterministic putting engine implemented outside the Lens Studio project with local unit coverage for alignment, left/right misses, target-zone boundaries, repeatability and aim reset.
- Pure putting-session state machine implemented outside the Lens Studio project with deterministic placement, aiming, rolling, result, retry and reset transitions.
- Pure interaction adapter implemented outside the Lens Studio project with guarded placement and aim modes, deterministic reducer dispatch, duplicate-completion protection, retry and reset behavior.
- Lens integration contract documented without selecting unverified Lens Studio APIs.
- Planned LEAF and manual Preview coverage documented for all five approved done criteria; no LEAF scenario has been implemented or executed.

## Unverified / outstanding
- GitHub app installation's effective scope across repositories.
- GitHub app installation scope and local Git authentication isolation still require independent validation before any remote write.
- Lens Studio account authorization is not established. It was not required for the planning interview, but publishing, Asset Library use, and other account-bound operations may require it later.
- Working preview, automated checks, submission materials.
- No automatic public publishing permitted.

## Standing operating model
- Only this repo and RegiNava1 connection may be used for SPECS GitHub operations.
- One or two bounded deliverables per batch. Commit after each validated deliverable.
- State what was actually tested versus merely documented. No repeated CI polling.
- GPT-5.6 Medium by default for Codex; High for complex CLAD/MCP work, subject to availability. State model and effort on every prompt.
- Work proceeds autonomously where safe; owner approval for permissions, expense, destructive operations, public release and product tradeoffs.

## Latest checkpoint
- Model / effort: GPT-5.6 Medium requested for Local Development Batch 3.
- Target: `RegiNava1/specs-golf-guide`, branch `main`, verified base `6a79496b27665d79899628286ab5f0f14c04f186`; resulting local commit is this checkpoint commit (recorded in the batch report).
- Files in this batch: `docs/lens-integration-contract.md`, `docs/leaf-acceptance-test-plan.md`, and `PROJECT_STATE.md` only.
- Deliverables: documentation-only integration contract and LEAF acceptance-test plan based on the approved brief and validated pure TypeScript modules.
- Validation: both documents reviewed against the approved brief, existing source/tests, and all five done criteria. Code tests were not rerun because no executable code changed; the most recently executed suite remains 16 passed, 0 failed.
- Lens Studio Preview: not run. The canonical Lens Studio project was intentionally left unchanged.
- Limitations: exact Lens scene components/materials, authored floor basis, transient aim-handle activation behavior, visual easing, and final LEAF selectors remain integration decisions requiring the supported CLAD/Preview workflow.
- Safety / cost: local-only work; no paid services, publishing, deployment, push, account-bound operations or unrelated repository access.

## Next bounded batch
1. Resolve or receive an officially supported path through the CLAD authorization gate.
2. Once permitted, use `docs/lens-integration-contract.md` to implement only the core scene, coordinate adapter, and placement/aiming foundation in the canonical Lens project.
3. Establish stable object names and add the first applicable planned LEAF scenarios, with manual Preview checks for scale, floor anchoring and comfort.
4. Keep rolling, feedback and retry/reset integration in later bounded increments unless explicitly included in the next approved batch.

## Batch 4 — ChatGPT-first source development (2026-10-27)
- Target: `RegiNava1/specs-golf-guide`, private `main`; initial base `9c586cc9d38d8dfe215676ad8a1bb50a5801ec51`.
- Added `src/floorCoordinates.ts`, `test/floorCoordinates.test.ts`, `src/puttAnimation.ts`, and `test/puttAnimation.test.ts` in commit `5102ee6cd925872c1c0d87dc54168e10e2641e76`.
- Ran Node v22.16 local tests for the four new files: 11 passed, 0 failed, 0 skipped. Existing 16 tests were not rerun in this environment; last reported baseline was 16 passed.
- Coordinates: supplied centimeter-scale orthonormal floor basis, direction mapping, and setup-local placement-offset subtraction. No assumption about actual Lens Studio world axes or floor height.
- Roll: pure deterministic 1.5-second linear interpolation, clamping, and completion flag; no scene animation or input binding.
- Lens Studio Preview and LEAF: not executed; all five approved acceptance criteria remain unverified in Preview.
- No canonical Lens Studio project, CLAD configuration, or untracked local files were changed; no paid service or publishing.
- Next: review contract compatibility and integrate through the official supported Lens Studio/CLAD workflow when available. Static TypeScript type-checking and combined existing+new test-suite run remain outstanding.

## Batch 6 — Offline interaction foundation (2026-10-28)
- Model / effort: GPT-5.6 Medium requested.
- Target: `RegiNava1/specs-golf-guide`, branch `main`, verified base `bcd856c16aa5d00c7d82229d254c947e29956776`; resulting local commit is this checkpoint commit (recorded in the batch report).
- Added `src/puttingInteraction.ts` and `test/puttingInteraction.test.ts`; updated `PROJECT_STATE.md` only for the mandatory checkpoint.
- Implemented a pure interaction adapter that separates transient placement/aim UI modes from durable reducer phases and reuses existing reducer actions for placement, aim, putt, completion, retry and reset.
- Validation: Node v24.16.0 combined suite passed 35 tests, 0 failed, 0 skipped, including eight focused interaction tests. No dependencies were installed.
- Lens Studio Preview and LEAF: not run. The canonical Lens Studio project, CLAD tooling, authorization configuration and MCP were intentionally untouched; all five approved Preview acceptance criteria remain unverified.
- Progress estimate: overall 57%, core logic/preparation 94%, Lens Studio implementation 5%. Only validated interaction logic increased the first two estimates; the Lens implementation estimate is unchanged.
- Limitations: no Lens/SIK event bindings, scene objects, handle hit testing, drag-to-floor conversion, visual state updates, animation playback, Preview evidence or LEAF scenarios.
- Safety / cost: local-only work; no paid services, publishing, deployment, push, authentication changes, unrelated repository access or canonical Lens project changes.
- Recommended next bounded batch: once the official CLAD authorization workflow is available, bind this adapter to the first stable scene/control selectors and validate placement plus aim interactions in Interactive Preview before adding rolling or feedback integration.

## Batch 7 — Local interactive prototype (2026-10-28)
- Model / effort: GPT-5.6 Medium requested.
- Target: `RegiNava1/specs-golf-guide`, private `main`, verified base `c4cd2473d4bcf61888201476a84360bba4997042`; local and remote result recorded in the batch report.
- Added `src/prototypeController.ts`, `prototype/index.html`, `prototype/app.ts`, `prototype/styles.css`, `prototype/server.mjs`, and `test/prototypeFlow.test.ts`; updated `README.md` and this checkpoint only.
- Implemented a dependency-free localhost prototype that reuses the existing engine, reducer, floor-coordinate adapter, roll sampler, and interaction adapter. The browser UI supports setup movement/confirmation, aim adjustment, deterministic 1.5-second putting, exact outcome feedback, retry, and reset.
- Automated validation: Node v24.16.0 combined suite passed 38 tests, 0 failed, 0 skipped. The new end-to-end test covers placement, direct success, left/right misses, reset/repeat, midpoint/completion timing, and invalid interaction handling.
- Browser validation: locally rendered and manually driven through moved placement, direct `On Target`, left `Missed Left`, right `Missed Right`, reset, and repeated direct success. The 22.5 cm practice zone, 10.8 cm regulation hole, 4.3 cm ball, aim line, phase controls, and feedback were visually distinct in the top-down representation.
- Lens Studio Preview and LEAF: not run. The canonical Lens Studio project, CLAD, MCP, SPECS authentication, and authorization configuration were intentionally untouched. No Lens acceptance criterion is passed by this prototype.
- Provisional progress: overall 60%, core logic/preparation 97%, Lens Studio implementation 5%. The increase reflects validated local end-to-end integration only; Lens implementation is unchanged.
- Safety / cost: zero dependencies and no paid services. Existing untracked files were preserved, and no Lens Studio or unrelated repository files were modified.
- Recommended next bounded batch: add a narrow browser automation smoke test only if repeatable UI regression coverage is needed; otherwise wait for the officially supported CLAD authorization path, then port stable selectors and the placement/aim slice into SPECS Interactive Preview before rolling/feedback integration.


## Batch 8 — Offline SPECS scene handoff (2026-10-28)
- Target private `RegiNava1/specs-golf-guide` main, initial base `f2cbcc3b5c2d48e028c579b53e01730182645ece`.
- Added `docs/offline-scene-assembly.md`, `assets/offline/putting-target.svg`, `assets/offline/interaction-handle.svg` in `96047aa1db303c29f7700957f6b8a640b0c27b0f`.
- Deliverables: proposed logical scene hierarchy/stable names, transform ownership, dimensions, visibility and reducer binding; two high-contrast proportional vector art references.
- Validation: reviewed specifications against the approved brief and integration contract. The two SVGs are well-formed XML in local validation. No new executable TypeScript code or test changes, so the most recently recorded suite remains Batch 7's 38 passed.
- No verified Lens Studio asset import, scene objects, CLAD authorization, Interactive Preview or LEAF tests. Lens implementation percentage remains 5%; overall 60% and core preparation 97% remain provisional and unchanged.
- No changes to the untracked canonical `lens-project/`, authentication, tooling or unrelated projects; no paid dependencies or Lens publication.
- Next: once official local editor workflow is available, use the handoff as reference for a first visible 3D scene, then placement and aiming. Do not claim the SVG files import into Lens Studio without checking.


## Batch 8B — Canonical visual reference package (2026-10-29)
- Target private `RegiNava1/specs-golf-guide` `main`, base `f172f032cc6005268e0e8dbe3c53045d5f9f5a89`.
- Added `docs/canonical-visual-assets.md`, `assets/canonical/visual-asset-manifest.json` and five SVG authoring references in commit `f8ff3ff4386b5e0e6cee032515770e32f6587dfa`.
- Canonical authored defaults: 4.3 cm white ball, 10.8 cm hole marker, 22.5 cm practice zone, cyan 150 cm aim line, 12 cm handles, underlying floor as ground, optional flag disabled.
- Validation: fetched committed files; manifest parses as JSON with eight enumerated assets; five SVGs passed basic opening/closing markup sanity checks (not a full XML or rendering check). No TypeScript changed; last executed automated suite remains Batch 7's 38 passed.
- No Lens Studio import, material/scene construction, SIK, Interactive Preview or LEAF tests performed. The generated visual concept sheet is illustrative only and was not committed as dimensional evidence.
- Progress unchanged at overall 60%, logic/preparation 97%, Lens implementation 5% (provisional). Canonical Lens project and account configuration untouched; no paid services or publication.
- Next: officially supported CLAD editor readiness, native geometry/material construction and real Preview/LEAF validation of the reference package. No additional offline speculative infrastructure recommended.

## Batch 11 — Move Setup and Confirm Placement (2026-11-02)
- Target: private `RegiNava1/specs-golf-guide` `main`, verified local/remote base `cea1bd79459c6c04efa955a6871063a998719883`.
- Added a SIK-backed 12 cm floor placement handle, a SpectaclesUIKit placement panel, and a Lens adapter for the tested `ACTIVATE_MOVE_SETUP`, `MOVE_PLACEMENT_HANDLE`, and `CONFIRM_PLACEMENT` transitions.
- The complete `PuttingSetup_Root` translates on the simulated floor, so the existing 150 cm ball-to-target spacing and child geometry remain unchanged. Confirm Placement disables interaction and hides the handle and placement controls.
- Validation: the existing Node suite passed 38 tests with 0 failures. Lens Studio TypeScript compilation succeeded, post-reset runtime logs contained no errors, and SPECS 27 Plane Interactive Preview successfully moved the setup by non-zero floor offsets and transitioned to `aiming` with visible `Placement confirmed` feedback.
- Acceptance criterion 1 is now validated in Interactive Preview for initial placement, real mouse drag through SIK, whole-setup movement, and confirmation. LEAF was not installed or executed because the project has no Leaf package and this batch prohibited package modification.
- Safety: no CaptureRuntimeViewTool, AiPreviewAgentInspect, helper-package injection, package installation/removal, authentication change, publishing, or unrelated-repository access. The sign-in-generated `.esproj` package metadata change remains outside the focused Batch 11 commit.
- Progress estimate after validated interaction: overall 72%, core logic/preparation 97%, validated Lens implementation 35%.
- Next bounded batch: connect adjustable aim to the existing interaction/reducer contract and validate target-fixed aiming in SPECS 27 Preview; keep rolling, feedback, retry/reset, and visual polish out of that batch.

## Batch 13 — Practice Putt and Ball Rolling (2026-11-03)
- Target: private `RegiNava1/specs-golf-guide` `main`, verified local/remote base `786bc354b8fb5ab71777bc20c92d705b7842bc53`.
- Added a large UIKit `Practice Putt` control and a deterministic Lens runtime roll adapter. It moves only the existing `GolfGuide_Development` visual exactly 150 cm along the selected planar aim over 1.5 seconds, preserves the 2.15 cm ball-center height, keeps rolling and result phases distinct, disables aim interaction while rolling, and completes once.
- Preview validation: centered endpoint `(0.00, 2.15, -230.00)`, left endpoint `(-13.81, 2.15, -229.36)`, and right endpoint `(13.81, 2.15, -229.36)` all completed at `1.500` seconds. Midpoint samples were observed, and every run reported `targetStable=true`. Move Setup activation and Confirm Placement transitions also remained operational; the attempted placement smoke drag emitted its interaction events but produced a zero offset, so prior Batch 11 non-zero movement evidence remains the movement regression baseline.
- Validation: Lens Studio TypeScript compilation succeeded, the final fresh runtime log contained no errors, and the combined dependency-free Node suite passed 38 tests with 0 failures. The controller remains under the 250-line module threshold.
- LEAF: not installed or run. The existing project package inventory has no Leaf package or registered scenario, and this batch prohibited package installation or helper injection.
- Safety: no `CaptureRuntimeViewTool`, AiPreviewAgent packages/handlers, package changes, authentication changes, publishing, unrelated-repository access, or outcome feedback/retry/reset implementation. The sign-in-generated `.esproj` package metadata change remains excluded from the focused batch.
- Progress estimate after validated rolling: overall 78%, core logic/preparation 97%, validated Lens implementation 50%. Acceptance Criterion 3 is validated in Preview; outcome feedback and retry/reset remain bounded later work.
- Next bounded batch: implement Acceptance Criterion 4 outcome feedback using the already calculated result, then validate On Target / Missed Left / Missed Right in Preview without adding retry/reset until its own batch.

## Batch 14 — Outcome Feedback (2026-11-03)
- Target: private `RegiNava1/specs-golf-guide` `main`, verified local/remote base `35124bab4db43cce06745ba9b848debc49f5ef9f`.
- Added a deterministic Lens-safe outcome classifier and a SpectaclesUIKit feedback label positioned near the stationary target. Feedback stays hidden during the 1.5-second roll and appears only after completion.
- Classification uses the actual ball endpoint and the inclusive 11.25 cm radius of the approved 22.5 cm practice target zone; it does not use the smaller 10.8 cm regulation hole.
- Preview validation: aligned endpoint `(0.00, 2.15, -230.00)` displayed `On Target`; left endpoint `(-12.62, 2.15, -229.47)` displayed `Missed Left`; right endpoint `(12.64, 2.15, -229.47)` displayed `Missed Right`. All runs completed at `1.500` seconds and reported `targetStable=true`.
- Validation: Lens Studio TypeScript compilation succeeded, the final fresh runtime log contained no errors, and the combined dependency-free Node suite passed 43 tests with 0 failures.
- Safety: no `CaptureRuntimeViewTool`, AiPreviewAgent packages/handlers, package changes, authentication changes, publishing, unrelated-repository access, Try Again, or Reset Setup implementation. The pre-existing `.esproj` metadata change remains excluded from the focused batch.
- Next bounded batch: implement Try Again and Reset Setup only, preserving the validated outcome display and all earlier placement, aiming, and rolling interactions.

## Batch 15 — Try Again and Reset Setup (2026-11-03)
- Target: private `RegiNava1/specs-golf-guide` `main`, verified local/remote base `acf8adec3bc3b4b5e27cd14bfa012064ca9666ab`.
- Added SpectaclesUIKit `Try Again` and `Reset Setup` controls to the existing result phase. Both actions are phase-guarded, so retry/reset requests outside `result` (including while rolling) are ignored.
- `Try Again` restores the ball to the current translated roll-start position, preserves setup placement and normalized aim, clears outcome feedback, and returns to aiming. `Reset Setup` restores the captured authored setup, ball, target, aiming guide, handles, zero placement offset, and default `(0, 0, -1)` direction; it clears feedback and returns to initial placement. No roll trail exists in the current Lens, so there is no accumulated trail state to clear.
- Automated validation: the combined dependency-free Node suite passed 43 tests with 0 failures. Coverage includes placement/aim preservation, retry, reset, invalid actions, duplicate completion protection, left/right outcomes, and repeated cycles without state leakage.
- Lens validation: TypeScript compilation succeeded, the project saved through the supported Editor API, and the final fresh SPECS 27 runtime log contained no errors and reached `initial-placement`. The owner then manually completed the full six-check SPECS 27 Preview walkthrough: non-zero placement and confirmation, nondefault aiming, a completed putt, Try Again with placement and aim preserved, a second putt with changed feedback, Reset Setup restoring the original arrangement, and a repeated cycle without state leakage. Acceptance Criterion 5 is PASS based on owner-observed manual Preview validation; this is not an automated or LEAF pass. Criteria 1–4 retained their previously validated behavior during the walkthrough.
- Outstanding visual defect: the putting station appears elevated above the simulated floor. Floor alignment / visual placement remains unresolved and was intentionally not modified in Batch 15.
- LEAF: not installed or run. No already-compatible Leaf package/scenario exists, and this batch did not install packages or inspection helpers.
- Safety: no `CaptureRuntimeViewTool`, AiPreviewAgentInspect, package injection or package changes, authentication changes, publishing, unrelated-repository access, or changes to the pre-existing `.esproj` metadata were included.
- Next bounded step: diagnose and correct the station's floor alignment in a separate bounded batch, then revalidate all five criteria in SPECS 27 Preview. Afterward perform submission-readiness review, demo capture, privacy/security checks, and Devpost packaging without adding features.
