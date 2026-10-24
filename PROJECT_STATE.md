# SPECS Golf Guide — Project state

As of 2026-10-24
Repository: `RegiNava1/specs-golf-guide`
Branch: `main`
Status: Official planning brief approved; standalone deterministic putting engine and session state machine implemented locally; future Lens integration and LEAF acceptance coverage documented; no Lens implementation has started.

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
