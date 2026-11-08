export type CompactMenuPhase =
  | "placement"
  | "aiming"
  | "rolling"
  | "result"
  | "holed"

export type CompactMenuActionId =
  | "lock"
  | "adjust-aim"
  | "stroke-putt"
  | "quick-putt"
  | "next-putt"
  | "replay-shot"
  | "reset-session"
  | "new-session"

export type CompactMenuPresentation = {
  visible: boolean
  rangeVisible: boolean
  rangeEditable: boolean
  centerAction: CompactMenuActionId | null
  sideActions: CompactMenuActionId[]
  instruction: string | null
}

export function getCompactMenuPresentation(
  phase: CompactMenuPhase
): CompactMenuPresentation {
  if (phase === "rolling") {
    return {
      visible: false,
      rangeVisible: false,
      rangeEditable: false,
      centerAction: null,
      sideActions: [],
      instruction: null,
    }
  }
  if (phase === "placement") {
    return {
      visible: true,
      rangeVisible: true,
      rangeEditable: true,
      centerAction: "lock",
      sideActions: [],
      instruction: "Drag + to place",
    }
  }
  if (phase === "aiming") {
    return {
      visible: true,
      rangeVisible: true,
      rangeEditable: false,
      centerAction: "stroke-putt",
      sideActions: ["adjust-aim", "quick-putt"],
      instruction: null,
    }
  }
  if (phase === "holed") {
    return {
      visible: true,
      rangeVisible: true,
      rangeEditable: false,
      centerAction: "new-session",
      sideActions: [],
      instruction: null,
    }
  }
  return {
    visible: true,
    rangeVisible: true,
    rangeEditable: false,
    centerAction: "reset-session",
    sideActions: ["next-putt", "replay-shot"],
    instruction: null,
  }
}

export function getManualStrokeActionLabel(completedPutts: number): string {
  return Number.isFinite(completedPutts) && completedPutts > 0
    ? "Putt Again"
    : "Stroke Putt"
}
