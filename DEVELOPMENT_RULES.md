# Development operating rules — SPECS Golf Guide

## Roles
- ChatGPT: product/architecture planning, compliance, bounded Codex prompts, review and state tracking.
- Codex: implementation and validation using official Lens Studio and CLAD tooling when available.
- Owner: product choices, costs, security boundary exceptions, dangerous actions, and public submission decisions.

## Required model notation
Every coding prompt must name an available Codex model and reasoning level. Default proposal: GPT-5.6 Medium for routine code/docs; GPT-5.6 High for CLAD/MCP integration, spatial interactions, architectural/security reviews and difficult debugging. Check actual model availability and adjust transparently. ChatGPT architecture planning: GPT-6 High when available.

## Bounded execution
- Aim for 1–2 deliverables per batch, with explicit affected files, success conditions, and maximum scope.
- Prefer incremental commits after verified milestones. Keep commits focused and reversible.
- Before edits inspect actual project state, head commit and working directory. No guessing.
- Run the narrowest relevant validation first; use Lens Studio Preview for actual visual/running behavior and LEAF tests as supported.
- Do not describe an unrun test, unavailable hardware feature, or MCP connection as passing.
- No repeated CI polling. Check a workflow after allowing it to progress while doing independent work; inspect failures once and avoid endless loops.
- One bounded recovery attempt per failing operation, then preserve known-good work, document the blocker, and stop that path.
- Don't block on routine choices, but do stop for costs, credential/permissions changes, destructive operations, account boundary violations, public publishing, genuine product tradeoffs or external actions that require owner involvement.
- Never promise unattended background operation beyond the active supported agent session.
- Do not activate billable APIs or paid services without approval. Prefer offline/local logic and zero recurring costs.
- Do not import pre-hackathon code. New source code for this submission must be authored during the contest period.

## Mandatory checkpoint report
At the end of each batch update PROJECT_STATE.md with:
- target repo/branch/base and resulting commit hash(es)
- exact files changed, deliverables done
- tools and tests actually run, results and limitations
- current functionality in Lens Studio Preview (observed vs unverified)
- outstanding blockers and next bounded batch
- safety / cost status

## AR and hackathon quality
Plan with the official Devpost Learn skill pack, retain generated docs under `devpost/`, build the Lens with CLAD and Lens Studio MCP, and verify the real Lens Studio project and preview. Favor a complete, reliable user journey over unverified advanced features. Keep the public demo shorter than three minutes.
