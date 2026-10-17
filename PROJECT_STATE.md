# SPECS Golf Guide — Project state

As of 2026-10-17
Repository: `RegiNava1/specs-golf-guide`
Branch: `main`
Status: Foundation documentation only; no Lens implementation or local environment validation.

## Verified
- Separate RegiNava1 GitHub connection is usable for this repository.
- Repository is private, default branch `main`, and read/write rights available under that identity.
- SECURITY_BOUNDARIES.md and DEVELOPMENT_RULES.md created with direct GitHub commits.
- Foundational documents are being added as a deliberately small documentation sequence.

## Unverified / outstanding
- GitHub app installation's effective scope across repositories.
- Codex local identity, Git credentials and filesystem isolation.
- Lens Studio installation, SPECS Base Template, CLAD plugin and Lens Studio MCP.
- Required planning skill execution and generated `devpost/` outputs.
- Working preview, automated checks, submission materials.
- No automatic public publishing permitted.

## Standing operating model
- Only this repo and RegiNava1 connection may be used for SPECS GitHub operations.
- One or two bounded deliverables per batch. Commit after each validated deliverable.
- State what was actually tested versus merely documented. No repeated CI polling.
- GPT-5.6 Medium by default for Codex; High for complex CLAD/MCP work, subject to availability. State model and effort on every prompt.
- Work proceeds autonomously where safe; owner approval for permissions, expense, destructive operations, public release and product tradeoffs.

## Next bounded batch
1. Confirm local machine setup and dedicated workspace; do not access other project folders.
2. Establish separate Codex/Git authentication and verify only this repository is targeted.
3. Create Lens Studio SPECS Base Template and install/verify CLAD, MCP and official planning skill.
4. Run official planning process, commit its outputs in small batches.
