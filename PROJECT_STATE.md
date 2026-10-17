# SPECS Golf Guide — Project state

As of 2026-10-17
Repository: `RegiNava1/specs-golf-guide`
Branch: `main`
Status: Official planning brief approved; no Lens implementation has started.

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
- Model / effort: GPT-5.6 Medium requested for the authorization investigation and planning completion.
- Target: `RegiNava1/specs-golf-guide`, branch `main`, base `af799915208768ad6251d23ceb6b7293850d0c57`.
- Files in this batch: `devpost/design-brief.md` and `PROJECT_STATE.md` only.
- Validation run: canonical cwd and `.esproj` existence; Lens Studio MCP panel probe; read-only active-project/version query; local-versus-upstream `plan-lens` instruction comparison; design-brief review against the official template and learner-approved clarifications.
- Lens Studio Preview: not run. No Lens implementation exists yet.
- Safety / cost: no paid services, no publishing, no unrelated repository access, and no Lens implementation.

## Next bounded batch
1. Start a fresh chat in the canonical Lens Studio project folder and give CLAD the approved `devpost/design-brief.md` build instruction.
2. Build the basic placement, aiming, deterministic putt, feedback, and retry flow for SPECS Preview; write LEAF coverage for the five done criteria before adding detail.
