# Security boundaries — SPECS Golf Guide

Status: Policy adopted; local environment and effective app authorization still require validation.
Repository: `RegiNava1/specs-golf-guide` (private during development).
Authorized GitHub account for this project: `RegiNava1`.

## Non-negotiable isolation
- All GitHub calls must explicitly use the RegiNava1 connection and target ONLY `RegiNava1/specs-golf-guide`.
- Never read, enumerate, clone, modify, compare with, or pull files from other repositories or projects. No copying code, data, artifacts, secrets, or configuration from other projects.
- This repository must not have credentials, collaborators, integrations, secrets, workflows, or deploy keys granting access to unrelated repositories.
- Do not use personal access tokens from another GitHub account. Never include credentials in chat, Codex prompts, source files, terminal logs, demos, screenshots, or commits.
- Codex must use the dedicated local workspace and restricted credentials. Do not assume a chat-level GitHub account selection restricts local Git, filesystem, MCP, or Codex credentials.
- Never use broad filesystem roots or parent folders containing unrelated projects as an agent workspace. Prefer a separate OS user for stronger local isolation.
- Do not change global Git, Codex, OS, or other-project configuration without explicit approval.
- Maintain least privilege. Review app installation scopes, repository selection, identity, and privileges before enabling auto-execution.
- Repository remains private until explicit owner approval for publication; public URL sharing grants no collaborator privileges.

## Before every remote write
1. Confirm expected owner and repo exactly match `RegiNava1/specs-golf-guide`.
2. Confirm correct linked identity `RegiNava1`, target branch, and known base revision.
3. Verify no secret, personal information, third-party confidential material, unrelated files, or unsafe generated outputs enter the commit.
4. Reject cross-repository actions and ambiguous authorization; pause on a boundary violation.

## Approval gates
Human approval required for costs, billing, new external integrations, credential changes, broad permissions, destructive operations, publication, judging access changes, or risky environment changes. Routine safe, narrowly scoped edits and validations may proceed autonomously.

## Disclosure readiness
Before public submission inspect tracked files and full Git history, credentials, collaborator list, Actions/workflow logs, third-party app permissions, metadata, licensing, and any private paths or personally identifying content. A clean working tree alone does not prove clean Git history.

## Outstanding validation
- [x] GitHub repository owner, private visibility, and available push permissions verified via the RegiNava1 account connection.
- [ ] GitHub app installation's effective repository scope verified independently.
- [ ] Local Windows workspace and Git authentication isolation verified.
- [ ] Codex working directory, sandbox, MCP tool permissions and authenticated identity verified.
- [ ] Prepublication repository and history audit completed.
