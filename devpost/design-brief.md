---
status: approved
---

# Design brief: SPECS Golf Guide

## The one spatial moment
A golfer stands behind a virtual golf ball in an open indoor space, keeps their eyes on the putting surface, and sees a thin aiming line drawn along the floor toward a virtual hole. They adjust the intended direction with a simple hand interaction, start a practice putt, watch the ball roll along that path, and receive brief feedback showing whether it was on target or missed left or right.

## Why it belongs on glasses
- Uses: draws in the world and leaves your body free.
- Why it's better than the phone or laptop version: the ball, aiming line, direction markers, and target appear at putting scale on the floor where the golfer is already looking. The golfer can adjust the line and repeat practice attempts without repeatedly looking away at a handheld screen.

## Product or overlay
- Type: product: the virtual putting practice station is the hackathon experience.
- What the real version would sense: a real floor or putting surface, golf ball, hole or selected target, distance, slope, and eventually shot or swing movement.
- Stand-in for the preview: the simulated room floor stands in for a flat indoor floor; the golf ball, hole, target ring, aiming line, and ball roll are all virtual. No real-object recognition or distance sensing is required.

## Where things live
- Where the user is looking during the main task: down toward the ball and putting line while aiming, then forward along the floor toward the target while observing the simulated putt.
- Virtual ball: anchored to the floor approximately 0.8 m in front of the golfer; regulation size, 4.3 cm diameter, with a subtle locating highlight or ring.
- Target and hole: anchored to the floor approximately 1.5 m beyond the ball and directly ahead by default; the hole is approximately 10.8 cm in diameter, surrounded by a visible target ring 20–25 cm across.
- Aiming line: a thin, contrasting floor-level line from the ball in the selected direction, with a small directional arrow and subtle markers. It remains readable without obscuring the floor.
- Aiming handle: near the target end of the aiming line and large enough for a forgiving pinch-and-drag interaction; approximately 12 cm across (default).
- Placement handle: near the ball while placement mode is active and large enough for a forgiving pinch-and-drag interaction; approximately 12 cm across (default).
- Control panel: approximately 1–1.2 m from the golfer, slightly beside the putting line at waist height. It is compact and uses large controls that remain reachable without covering the ball, line, or target.
- Feedback: a small, readable indicator near the target that says “On Target,” “Missed Left,” or “Missed Right.”
- Putting setup: the ball, aiming line, and target are anchored together and reposition as one group while preserving their relative positions.

## Hands and input
- Enter placement mode: pinch the large “Move Setup” button.
- Reposition the setup: pinch and drag the placement handle along the floor; the ball, line, and target move together. Releasing the handle confirms its position visually, and “Confirm Placement” exits placement mode.
- Adjust the intended direction: pinch “Adjust Aim,” then pinch and drag the aiming handle left or right. The line updates immediately while the virtual hole stays fixed.
- Start a putt: pinch the large “Practice Putt” button.
- Repeat: pinch “Try Again” to return the ball while preserving the selected direction; pinch “Reset Setup” to restore the original relative positions and default direction.
- Targets are big and highlight when aimed at.
- Voice (if any) and the button that does the same job: none; all essential actions use mouse-supported buttons and drag interactions.

## When things show
- Initial placement: the ball, target, subtle putting line, placement handle, and a short “Position your putting setup” instruction fade in. The panel shows “Move Setup” and “Confirm Placement.”
- Placement confirmation: the placement handle and instruction fade out after confirmation, with a subtle visual acknowledgment.
- Aiming: the aiming line becomes more visible with a directional arrow. The aiming handle appears while “Adjust Aim” is active, and temporary instructions fade after interaction begins. The line subtly changes color or brightness when aimed directly toward the target.
- Practice putt: the aiming handle and most controls fade out. The line briefly brightens, then becomes faint as the ball rolls deterministically along the user-selected direction for the fixed ball-to-target distance. There is no random deviation, hidden correction, or automatic aim adjustment. The hole and target ring remain visible, and a subtle motion trail follows the ball.
- Result: when the ball stops, its final position and a faint path trail remain briefly visible. The result is calculated from that final position relative to the stationary target. “On Target” means the ball stopped within the 20–25 cm practice target zone; it does not mean that a regulation putt was holed. A concise result appears near the target, and “Try Again” becomes available. An on-target putt receives a subtle success animation.
- Next attempt: “Try Again” returns the ball to its starting position, clears the previous trail and feedback, restores the aiming UI, and preserves the selected direction. “Reset Setup” restores the default arrangement and direction.
- Transitions: simple fades take approximately 0.2–0.4 seconds, with reduced-motion fallbacks where practical.
- If something needs attention out of view: none; the main task and its feedback remain along the floor in front of the golfer.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. On launch, the virtual ball, target, and aiming line appear anchored to the simulated floor. Using “Move Setup” and the placement handle moves the whole arrangement while preserving its relative layout, and confirming placement exits placement mode.
2. Selecting “Adjust Aim” and dragging the aiming handle left or right immediately changes the line direction while the virtual hole stays fixed; the line can be aimed directly at the hole or deliberately to either side.
3. Selecting “Practice Putt” hides or reduces the aiming controls and rolls the virtual ball smoothly and deterministically along the selected direction for the fixed ball-to-target distance while the stationary hole and target remain visible, without physical equipment, custom gestures, or external sensors. There is no random deviation, hidden correction, or automatic aim adjustment.
4. The ball's final position relative to the stationary target produces calculated feedback near the target: stopping within the 20–25 cm practice target zone shows “On Target,” while deliberate left and right aim adjustments show “Missed Left” and “Missed Right.” “On Target” describes reaching the practice target zone, not holing a regulation putt.
5. Selecting “Try Again” returns the ball while preserving aim, and the user can adjust and putt again. Selecting “Reset Setup” restores the original arrangement and default aim. The entire placement, aiming, putt, feedback, and retry sequence works repeatedly without errors.

## Out of scope
- Recognizing or tracking a real golf ball, club, hole, or putting green.
- Automatic real-world distance measurement, slope or green-contour detection, and real-ball physics.
- Physical putting strokes, swing analysis, custom gestures, hand-speed sensing, and voice-dependent controls.
- Outdoor course guidance, shot alignment beyond this putting moment, and broader swing coaching.
- Requiring real SPECS hardware or specialized golf equipment for the hackathon demonstration.

## Risks and open questions
- Comfort, readability, hand-tracking reliability, and alignment on real SPECS hardware remain unproven; the hackathon validates logic and interaction in Preview.
- The exact control and handle dimensions may need adjustment after Preview inspection; the initial handle size is marked as a default.
- “On Target” is fixed as stopping within the 20–25 cm practice target zone. The deterministic roll uses the fixed ball-to-target distance; its animation duration begins at a smooth 1.5 seconds (default) and may be tuned for readability without changing the result logic.
- Repositioning is limited to a flat simulated floor; uneven real surfaces and automatic floor understanding are not part of this version.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write “logic proven” next to anything the tests and preview show working, and “feel unproven” next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: “Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests.” If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
