# SPECS Golf Guide — Project state

As of 2026-10-24
Repository: `RegiNava1/specs-golf-guide`
Branch: `main`
Status: Official planning brief approved; standalone deterministic putting engine and session state machine implemented locally; no Lens implementation has started.

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
- Model / effort: GPT-5.6 High requested for Local Development Batch 2.
- Target: `RegiNava1/specs-golf-guide`, branch `main`, base `7346264a74aedebc2d1151f9187b48ebfff65327`; resulting local commit is this checkpoint commit (recorded in the batch report).
- Files in this batch: `src/puttingSession.ts`, `test/puttingSession.test.ts`, and `PROJECT_STATE.md` only.
- Deliverables: pure Lens-independent session state machine and focused transition/cycle tests, reusing the Batch 1 deterministic engine.
- Validation run: Batch 1 and Batch 2 suites together with Node.js built-in test runner and TypeScript type stripping; exact result recorded in the batch report.
- Lens Studio Preview: not run. The canonical Lens Studio project was intentionally left unchanged.
- Limitations: state transitions are logic-only; rolling exposes a calculated endpoint but does not interpolate animation; there is no UI, gesture, scene, Preview or Lens integration.
- Safety / cost: local-only work; no paid services, publishing, deployment, push, account-bound operations or unrelated repository access.

## Next bounded batch
1. Resolve or receive an officially supported path through the CLAD authorization gate.
2. Once permitted, integrate the validated engine and state machine into one bounded Lens controller and add Preview/LEAF coverage without expanding the approved feature set.
