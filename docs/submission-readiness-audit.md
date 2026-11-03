# SPECS Golf Guide — submission readiness audit

Audit date: 2026-11-03

Audited baseline: `72fb0324222b9805af6288f6464efe57ca4fa747`

Submission deadline: 2026-11-09 at 5:00 PM EST

## Readiness summary

The completed gameplay is ready to demonstrate in SPECS 27 Plane Interactive Preview. Public release should wait for the owner's explicit approval and two prepublication items:

1. Resolve or deliberately clear the two dangling ambient-environment texture references in `Assets/Scene.scene`, then open and compile a fresh remote checkout in Lens Studio.
2. Protect the local untracked signing key from accidental staging before changing the repository from private to public.

No Lens publication or SPECS package ID is required by the hackathon rules; the required working artifact is the Lens Studio Preview project.

## Repository and clean-checkout evidence

- GitHub `RegiNava1/specs-golf-guide` is currently **private** and `origin/main` is at the audited baseline.
- A fresh clone from the private GitHub remote completed successfully.
- `git lfs fsck` passed. All seven LFS-managed files materialized: four golf meshes, `Base.png`, SpectaclesInteractionKit, and SpectaclesUIKit.
- The fresh checkout contained the canonical `.esproj`, saved scene, six gameplay scripts and metadata, four validated PBR materials and shared shader, four golf meshes and metadata, render target/camera texture, and the SIK/UIKit packages and metadata.
- The dependency-free Node suite passed **43/43** from an independent HEAD-only checkout.
- Authored golf materials reference the committed `simple_pbr.graphShader`; the scene's golf mesh, material, and script UUIDs map to committed files.
- Committed source imports only SpectaclesInteractionKit and SpectaclesUIKit. The untracked Motion and Icons packages are not referenced by authored source or the committed UIKit package.
- Static clean-checkout reference checking found two unresolved UUIDs on the Ambient Light component:
  - diffuse environment texture: `2013a19b-93c1-4f21-b7ea-876a33550c7b`
  - specular environment texture: `d795fd46-e16b-4cb9-8dfb-4ef227298f7a`
- Lens Studio's asset database returns `null` for both UUIDs. Current compilation, Preview rendering, and runtime logs remain clean, so this is an environment-lighting portability defect rather than a demonstrated gameplay failure.
- A fresh remote checkout was not opened in Lens Studio during this audit because doing so would replace the validated canonical editor session. Clean-clone Lens Studio open/compile therefore remains a final validation gap.

## Public-release and security findings

### Must address before public release

- The rules require a **public** GitHub, GitLab, or Bitbucket repository at submission time. Keep this repository private until the owner explicitly approves publication.
- `lens-project/specs-golf-guide/signing_key.pem` exists locally as an untracked file and is not covered by the current project `.gitignore`. It is absent from `origin/main` and its history. Never stage or publish it; add a specific ignore rule or move it outside the repository in a separate approved security batch.
- The only origin remote is `RegiNava1/specs-golf-guide`. A scan of `origin/main` found no private keys, token patterns, credentials, absolute local paths, `.mcp.json`, live-instance files, AiPreviewAgent helpers, or CaptureRuntime helpers.
- Local Codex checkpoint refs can retain snapshots of untracked working-tree files. Those refs are local and are not present under `refs/remotes/origin`; do not push non-main refs.

### Keep untracked unless separately reviewed

- The dirty `.esproj` change contains the placeholder package ID `com.example.specsbasetemplate`; committed HEAD correctly keeps package ID/version empty for Preview-only development.
- Do not add `.virtual-scene.json`, `ls-live-instance.json`, local MCP/agent configuration, `Plugins/`, the obsolete `sepcs-golf-guide-lens` project, credentials, or generated editor state.
- The untracked zero-pass/legacy materials, prefab proof, Echopark HDR, Icons package, and Motion package are not referenced by the committed gameplay dependency set. Do not add them wholesale.

### Ownership and licensing review

- No repository license is currently committed. The hackathon rules do not explicitly require an open-source license, but the public repository must remain available without charge for judging and testing through the judging period.
- Before publication, the owner should choose whether to add a source license and confirm redistribution terms for all included template/package assets. SIK/UIKit are official Lens Studio packages and expected project dependencies, but this audit is not legal advice.
- Do not include copyrighted music, third-party footage, private desktop content, account details, or unrelated trademarks in the video.

## Validation classification

- **Manual/native Preview evidence:** all five acceptance criteria have been exercised in SPECS 27 Plane Interactive Preview, including non-zero placement, target-stable left/right aim, deterministic 1.5-second puts, all three outcomes, retry, reset, repeated cycles, and corrected floor alignment.
- **Automated local evidence:** 43 Node tests passed; Lens Studio TypeScript compilation and runtime logs were clean in the validated canonical project.
- **LEAF:** no LEAF package, scenario, or execution result exists. Do not describe any acceptance criterion as LEAF-tested.
- **Hardware:** real SPECS comfort and hand tracking remain untested and are not required for this Preview-based submission.

## Under-three-minute demonstration plan

Target length: **2:15–2:35**. Record the Preview panel cleanly; avoid account information and unrelated desktop content.

1. **0:00–0:10 — Immediate hook:** Show the complete floor-aligned putting station and say: “SPECS Golf Guide is a hands-free virtual putting practice station for small indoor spaces.”
2. **0:10–0:30 — Placement:** Select **Move Setup**, drag to a visibly non-zero position, then **Confirm Placement**. Call out that ball, line, and target remain 150 cm apart.
3. **0:30–0:50 — Missed Left:** Select **Adjust Aim**, drag left while the target remains fixed, start **Practice Putt**, and show the 1.5-second roll plus `Missed Left`.
4. **0:50–1:12 — Missed Right after retry:** Select **Try Again** and point out that placement and aim context are preserved. Adjust right, putt, and show `Missed Right` with fresh feedback.
5. **1:12–1:35 — On Target:** Select **Reset Setup**, confirm placement, retain the default centered aim, putt, and show `On Target`. State that success uses the 22.5 cm practice zone, not the smaller regulation hole.
6. **1:35–1:55 — Repeatability:** Use **Try Again** once more to show the ball returns without stale feedback; briefly adjust aim and mention deterministic behavior/no automatic correction.
7. **1:55–2:20 — Close:** Summarize the glasses-specific value, CLAD/Lens Studio MCP workflow, and what was learned. Keep any build-process montage secondary to the working Preview.

Recording notes:

- Show the Lens working in the first ten seconds.
- Capture readable feedback labels and the stationary target during aim changes.
- Use narration or original/royalty-cleared audio only; music is unnecessary.
- Review the final upload at normal playback speed and while logged out.

## Submission checklist

Official requirements were rechecked on 2026-11-03 against the [overview](https://learn-specs.devpost.com/), [official rules](https://learn-specs.devpost.com/rules), [schedule](https://learn-specs.devpost.com/details/dates), and [FAQ](https://learn-specs.devpost.com/details/faqs).

### Project and repository

- [x] New SPECS Lens built during the submission period.
- [x] Planned with the Devpost Learn skill pack; approved brief is under `devpost/`.
- [x] Built through CLAD, Lens Studio, and Lens Studio MCP.
- [x] Runs consistently in Lens Studio SPECS Preview.
- [x] Canonical Lens project, source, packages, metadata, and LFS objects are present on private `origin/main`.
- [ ] Resolve/clear the two ambient-light dangling UUIDs and validate a fresh remote clone in Lens Studio.
- [ ] Protect the local signing key with an explicit ignore/move step.
- [ ] Decide repository license/attribution approach.
- [ ] Owner explicitly approves changing repository visibility to public.
- [ ] After approval, make the repository public and confirm the public URL works while logged out.

### Demo video

- [ ] Record a Lens Studio Preview demonstration under three minutes.
- [ ] Show all required interactions and `On Target`, `Missed Left`, and `Missed Right`.
- [ ] Remove personal/account information and unlicensed third-party media.
- [ ] Upload to **YouTube** and make it publicly visible.
- [ ] Verify playback and embedding while logged out; copy the public URL.

### Devpost form

- [ ] Join/register for the hackathon and start a draft early.
- [ ] Project name and concise tagline.
- [ ] 3:2 thumbnail image, JPG/PNG/GIF, no more than 5 MB (standard Devpost guidance).
- [ ] “Built with” list: Lens Studio 5.23.2, CLAD, Lens Studio MCP, TypeScript, SpectaclesInteractionKit, SpectaclesUIKit.
- [ ] Team/representative information if applicable.
- [ ] English project story/text description covering what it does, who it is for, features, Preview limitations, and what was learned.
- [ ] Public repository URL.
- [ ] Public YouTube demonstration URL.
- [ ] Complete any hackathon-specific Additional Info questions shown in the live form.
- [ ] Accept the applicable terms and conditions.
- [ ] Submit before **2026-11-09 5:00 PM EST** and verify the entry is not left as a draft.

The signed-in Devpost form may contain additional required questions that are not exposed on the public rules page. Treat the live draft form as authoritative for those fields.
