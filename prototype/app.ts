import { PuttingPrototypeController } from "/src/prototypeController.ts";
import {
  INITIAL_TARGET_ZONE_DIAMETER_CM,
  REGULATION_HOLE_DIAMETER_CM,
  type Vector2,
} from "/src/puttingEngine.ts";

const controller = new PuttingPrototypeController();
const svg = document.querySelector<SVGSVGElement>("#course")!;
const ball = document.querySelector<SVGCircleElement>("#ball")!;
const targetGroup = document.querySelector<SVGGElement>("#target-group")!;
const targetZone = document.querySelector<SVGCircleElement>("#target-zone")!;
const hole = document.querySelector<SVGCircleElement>("#regulation-hole")!;
const aimLine = document.querySelector<SVGLineElement>("#aim-line")!;
const aimHandle = document.querySelector<SVGCircleElement>("#aim-handle")!;
const hint = document.querySelector<HTMLElement>("#interaction-hint")!;
const phaseReadout = document.querySelector<HTMLElement>("#phase-readout")!;
const aimReadout = document.querySelector<HTMLElement>("#aim-readout")!;
const feedback = document.querySelector<HTMLElement>("#feedback")!;
const moveButton = document.querySelector<HTMLButtonElement>("#move-button")!;
const confirmButton = document.querySelector<HTMLButtonElement>("#confirm-button")!;
const aimButton = document.querySelector<HTMLButtonElement>("#aim-button")!;
const puttButton = document.querySelector<HTMLButtonElement>("#putt-button")!;
const retryButton = document.querySelector<HTMLButtonElement>("#retry-button")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset-button")!;

const AIM_DISTANCE_CM = 150;
const SVG_BALL_BASELINE_Y = 190;
let activePointerId: number | null = null;

targetZone.setAttribute("r", String(INITIAL_TARGET_ZONE_DIAMETER_CM / 2));
hole.setAttribute("r", String(REGULATION_HOLE_DIAMETER_CM / 2));

function toSvg(point: Vector2): Vector2 {
  return { x: point.x, y: SVG_BALL_BASELINE_Y - point.y };
}

function pointerToLogic(event: PointerEvent): Vector2 {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const local = point.matrixTransform(svg.getScreenCTM()!.inverse());
  return { x: local.x, y: SVG_BALL_BASELINE_Y - local.y };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function setCirclePosition(element: SVGCircleElement, point: Vector2): void {
  const svgPoint = toSvg(point);
  element.setAttribute("cx", String(svgPoint.x));
  element.setAttribute("cy", String(svgPoint.y));
}

function labelPhase(phase: string): string {
  return phase.replace("-", " ").replace(/^./, (value) => value.toUpperCase());
}

function render(): void {
  const { mode, session } = controller.state;
  const start = session.startingBallPosition;
  const target = session.targetPosition;
  const aimEnd = {
    x: start.x + session.aimDirection.x * AIM_DISTANCE_CM,
    y: start.y + session.aimDirection.y * AIM_DISTANCE_CM,
  };
  const startSvg = toSvg(start);
  const aimEndSvg = toSvg(aimEnd);
  const targetSvg = toSvg(target);

  setCirclePosition(ball, controller.displayedBallPosition);
  targetGroup.setAttribute("transform", `translate(${targetSvg.x} ${targetSvg.y})`);
  aimLine.setAttribute("x1", String(startSvg.x));
  aimLine.setAttribute("y1", String(startSvg.y));
  aimLine.setAttribute("x2", String(aimEndSvg.x));
  aimLine.setAttribute("y2", String(aimEndSvg.y));
  aimHandle.setAttribute("cx", String(aimEndSvg.x));
  aimHandle.setAttribute("cy", String(aimEndSvg.y));
  aimHandle.classList.toggle("visible", mode === "adjusting-aim");

  phaseReadout.textContent = labelPhase(session.phase);
  aimReadout.textContent = `${session.aimDirection.x.toFixed(3)}, ${session.aimDirection.y.toFixed(3)}`;

  const placementPhase = session.phase === "initial-placement" || session.phase === "moving-setup";
  moveButton.disabled = !placementPhase || mode === "moving-setup";
  moveButton.classList.toggle("active", mode === "moving-setup");
  confirmButton.disabled = !placementPhase;
  aimButton.disabled = session.phase !== "aiming" || mode === "adjusting-aim";
  aimButton.classList.toggle("active", mode === "adjusting-aim");
  puttButton.disabled = session.phase !== "aiming";
  retryButton.disabled = session.phase !== "result";
  resetButton.disabled = session.phase === "rolling";

  svg.classList.toggle("is-interactive", mode === "moving-setup" || mode === "adjusting-aim");

  if (mode === "moving-setup") {
    hint.textContent = "Drag anywhere on the green to reposition the complete setup.";
  } else if (mode === "adjusting-aim") {
    hint.textContent = "Drag the gold aiming handle left or right, then start the putt.";
  } else if (session.phase === "rolling") {
    hint.textContent = "Deterministic 1.5-second roll in progress…";
  } else if (session.phase === "result") {
    hint.textContent = "Try again with a new aim, or reset the whole setup.";
  } else if (placementPhase) {
    hint.textContent = "Move the setup if desired, then confirm placement.";
  } else {
    hint.textContent = "Adjust aim or practice the putt.";
  }

  feedback.className = "feedback";
  if (session.phase === "result" && session.outcome !== null) {
    feedback.textContent = session.outcome.classification;
    feedback.classList.add(session.outcome.classification === "On Target" ? "on-target" : "missed");
  } else if (session.phase === "rolling") {
    feedback.textContent = "Rolling…";
  } else {
    feedback.textContent = "Awaiting putt";
  }
}

function applyPointer(event: PointerEvent): void {
  const { mode, session } = controller.state;
  const logicPoint = pointerToLogic(event);
  if (mode === "moving-setup") {
    controller.moveSetup({
      x: clamp(logicPoint.x - session.initialBallPosition.x, -65, 65),
      y: clamp(logicPoint.y - session.initialBallPosition.y, -25, 35),
    });
  } else if (mode === "adjusting-aim") {
    controller.adjustAim({
      x: logicPoint.x - session.startingBallPosition.x,
      y: logicPoint.y - session.startingBallPosition.y,
    });
  }
  render();
}

svg.addEventListener("pointerdown", (event) => {
  const { mode } = controller.state;
  if (mode !== "moving-setup" && mode !== "adjusting-aim") return;
  activePointerId = event.pointerId;
  svg.setPointerCapture(event.pointerId);
  applyPointer(event);
});
svg.addEventListener("pointermove", (event) => {
  if (event.pointerId === activePointerId) applyPointer(event);
});
function releasePointer(event: PointerEvent): void {
  if (event.pointerId === activePointerId) {
    activePointerId = null;
    svg.releasePointerCapture(event.pointerId);
  }
}
svg.addEventListener("pointerup", releasePointer);
svg.addEventListener("pointercancel", releasePointer);

moveButton.addEventListener("click", () => { controller.activateMoveSetup(); render(); });
confirmButton.addEventListener("click", () => { controller.confirmPlacement(); render(); });
aimButton.addEventListener("click", () => { controller.activateAdjustAim(); render(); });
puttButton.addEventListener("click", () => {
  if (!controller.practicePutt(performance.now())) return;
  const animate = (nowMs: number) => {
    const frame = controller.tick(nowMs);
    render();
    if (frame !== null && !frame.complete) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
  render();
});
retryButton.addEventListener("click", () => { controller.tryAgain(); render(); });
resetButton.addEventListener("click", () => { controller.resetSetup(); render(); });

render();
