export type CompactMenuPhase = "placement" | "aiming" | "rolling" | "result"

export type CompactMenuActionId =
  | "lock"
  | "adjust-aim"
  | "quick-putt"
  | "retry"
  | "reset-all"

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
      rangeEditable: true,
      centerAction: null,
      sideActions: ["adjust-aim", "quick-putt"],
      instruction: null,
    }
  }
  return {
    visible: true,
    rangeVisible: true,
    rangeEditable: false,
    centerAction: null,
    sideActions: ["retry", "reset-all"],
    instruction: null,
  }
}
