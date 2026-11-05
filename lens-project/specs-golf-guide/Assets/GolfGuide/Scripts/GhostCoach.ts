import type {PuttClassification} from "./GolfOutcome"
import type {AimDeviation, DistanceFeedback} from "./StrokeSimulation"

export interface GhostCoachInput {
  readonly classification: PuttClassification
  readonly aimDeviation: AimDeviation
  readonly distanceFeedback: DistanceFeedback
  readonly selectedDistanceCm: number
  readonly travelDistanceCm: number
}

export interface GhostCoachFeedback {
  readonly classification: PuttClassification
  readonly outcome: GhostCoachOutcome
  readonly tip: string
  readonly summary: string
  readonly intendedPath: string
  readonly actualPath: string
}

export type GhostCoachOutcome =
  | PuttClassification
  | "Too Short"
  | "Too Long"

function actualPathArrow(aimDeviation: AimDeviation): string {
  if (aimDeviation === "Left of Aim") {
    return "↖"
  }
  if (aimDeviation === "Right of Aim") {
    return "↗"
  }
  return "↑"
}

function actualPathLength(distanceFeedback: DistanceFeedback): string {
  if (distanceFeedback === "Short") {
    return "━━"
  }
  if (distanceFeedback === "Long") {
    return "━━━━━━"
  }
  return "━━━━"
}

function coachingOutcome(input: GhostCoachInput): GhostCoachOutcome {
  if (input.classification === "On Target") {
    return "On Target"
  }
  if (input.aimDeviation === "Left of Aim") {
    return "Missed Left"
  }
  if (input.aimDeviation === "Right of Aim") {
    return "Missed Right"
  }
  if (input.distanceFeedback === "Short") {
    return "Too Short"
  }
  if (input.distanceFeedback === "Long") {
    return "Too Long"
  }
  return input.classification
}

function coachingTip(outcome: GhostCoachOutcome): string {
  if (outcome === "On Target") {
    return "Good line and pace—repeat that stroke."
  }
  if (outcome === "Missed Left") {
    return "Path went left—stroke straighter through the ball."
  }
  if (outcome === "Missed Right") {
    return "Path went right—stroke straighter through the ball."
  }
  if (outcome === "Too Short") {
    return "Finished short—use a longer back-and-forward drag."
  }
  if (outcome === "Too Long") {
    return "Finished long—use a shorter back-and-forward drag."
  }
  return "Keep the stroke path centered on the selected aim."
}

export function createGhostCoachFeedback(
  input: GhostCoachInput
): GhostCoachFeedback {
  if (
    !Number.isFinite(input.selectedDistanceCm) ||
    input.selectedDistanceCm <= 0 ||
    !Number.isFinite(input.travelDistanceCm) ||
    input.travelDistanceCm < 0
  ) {
    throw new Error("Ghost Coach distances must be finite and nonnegative.")
  }

  const outcome = coachingOutcome(input)
  return {
    classification: input.classification,
    outcome,
    tip: coachingTip(outcome),
    summary: `${input.aimDeviation} • ${input.distanceFeedback} • ${input.travelDistanceCm.toFixed(
      0
    )}/${input.selectedDistanceCm.toFixed(0)} cm`,
    intendedPath: "Aim     ● ━━━━ ◎",
    actualPath: `Stroke  ● ${actualPathLength(input.distanceFeedback)} ${actualPathArrow(
      input.aimDeviation
    )}`,
  }
}
