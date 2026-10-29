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
