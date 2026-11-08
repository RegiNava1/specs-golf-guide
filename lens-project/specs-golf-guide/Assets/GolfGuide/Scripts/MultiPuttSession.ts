import type {DistanceToHole, WorldPointCm} from "./DistanceToHole"

export const REGULATION_HOLE_RADIUS_CM = 5.4
const COMPARISON_EPSILON_CM = 1e-9

export type MultiPuttPhase =
  | "placement"
  | "aiming"
  | "rolling"
  | "result"
  | "holed"

export type MultiPuttSource = "quick-putt" | "virtual-stroke"

export type TargetZoneResult =
  | "On Target"
  | "Missed Left"
  | "Missed Right"

export type GroundDirection = {
  readonly x: number
  readonly z: number
}

export type MultiPuttRoll = {
  readonly startPosition: WorldPointCm
  readonly endpoint: WorldPointCm
  readonly aimDirection: GroundDirection
  readonly nominalDistanceCm: number
  readonly targetZoneResult: TargetZoneResult
  readonly source: MultiPuttSource
}

export type CompletedPuttSnapshot = MultiPuttRoll & {
  readonly remainingDistanceCm: number
  readonly isHoled: boolean
}

export type MultiPuttSessionState = {
  readonly phase: MultiPuttPhase
  readonly originalStartPosition: WorldPointCm
  readonly currentPuttStartPosition: WorldPointCm
  readonly ballPosition: WorldPointCm
  readonly holePosition: WorldPointCm
  readonly defaultAimDirection: GroundDirection
  readonly aimDirection: GroundDirection
  readonly completedPutts: number
  readonly remainingDistanceCm: number
  readonly currentNominalDistanceCm: number
  readonly activeRoll: MultiPuttRoll | null
  readonly lastCompletedPutt: CompletedPuttSnapshot | null
  readonly targetZoneResult: TargetZoneResult | null
  readonly isHoled: boolean
}

export type MultiPuttSessionSetup = {
  readonly ballPosition: WorldPointCm
  readonly holePosition: WorldPointCm
  readonly defaultAimDirection: GroundDirection
  readonly nominalDistanceCm?: number
  readonly startPhase?: "placement" | "aiming"
}

export type DistanceToHoleCalculator = (
  ballWorldPosition: WorldPointCm | null | undefined,
  holeWorldPosition: WorldPointCm | null | undefined
) => DistanceToHole | null

export type MultiPuttSessionAction =
  | {readonly type: "CONFIRM_PLACEMENT"}
  | {readonly type: "SET_AIM"; readonly aimDirection: GroundDirection}
  | {
      readonly type: "START_ROLL"
      readonly endpoint: WorldPointCm
      readonly aimDirection: GroundDirection
      readonly nominalDistanceCm: number
      readonly targetZoneResult: TargetZoneResult
      readonly source: MultiPuttSource
    }
  | {readonly type: "COMPLETE_ROLL"}
  | {readonly type: "NEXT_PUTT"}
  | {readonly type: "REPLAY_SHOT"}
  | {readonly type: "RESET_SESSION"}

function copyPoint(point: WorldPointCm): WorldPointCm {
  return {x: point.x, y: point.y, z: point.z}
}

function copyDirection(direction: GroundDirection): GroundDirection {
  return {x: direction.x, z: direction.z}
}

function isFinitePoint(point: WorldPointCm): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Number.isFinite(point.z)
  )
}

function normalizeDirection(direction: GroundDirection): GroundDirection | null {
  if (!Number.isFinite(direction.x) || !Number.isFinite(direction.z)) {
    return null
  }
  const length = Math.hypot(direction.x, direction.z)
  return length > 0
    ? {x: direction.x / length, z: direction.z / length}
    : null
}

function getDistanceCm(
  ballPosition: WorldPointCm,
  holePosition: WorldPointCm,
  calculateDistanceToHole: DistanceToHoleCalculator
): number | null {
  return calculateDistanceToHole(ballPosition, holePosition)?.centimeters ?? null
}

function isTargetZoneResult(value: string): value is TargetZoneResult {
  return (
    value === "On Target" ||
    value === "Missed Left" ||
    value === "Missed Right"
  )
}

export function createMultiPuttSession(
  setup: MultiPuttSessionSetup,
  calculateDistanceToHole: DistanceToHoleCalculator
): MultiPuttSessionState {
  if (!isFinitePoint(setup.ballPosition) || !isFinitePoint(setup.holePosition)) {
    throw new Error("ballPosition and holePosition must contain finite coordinates.")
  }
  const defaultAimDirection = normalizeDirection(setup.defaultAimDirection)
  if (!defaultAimDirection) {
    throw new Error("defaultAimDirection must be a finite non-zero ground direction.")
  }
  const remainingDistanceCm = getDistanceCm(
    setup.ballPosition,
    setup.holePosition,
    calculateDistanceToHole
  )
  if (remainingDistanceCm === null || remainingDistanceCm <= 0) {
    throw new Error("ballPosition and holePosition must be horizontally distinct.")
  }
  const nominalDistanceCm = setup.nominalDistanceCm ?? remainingDistanceCm
  if (!Number.isFinite(nominalDistanceCm) || nominalDistanceCm <= 0) {
    throw new Error("nominalDistanceCm must be finite and greater than zero.")
  }

  return {
    phase: setup.startPhase ?? "placement",
    originalStartPosition: copyPoint(setup.ballPosition),
    currentPuttStartPosition: copyPoint(setup.ballPosition),
    ballPosition: copyPoint(setup.ballPosition),
    holePosition: copyPoint(setup.holePosition),
    defaultAimDirection,
    aimDirection: copyDirection(defaultAimDirection),
    completedPutts: 0,
    remainingDistanceCm,
    currentNominalDistanceCm: nominalDistanceCm,
    activeRoll: null,
    lastCompletedPutt: null,
    targetZoneResult: null,
    isHoled: false,
  }
}

export function transitionMultiPuttSession(
  state: MultiPuttSessionState,
  action: MultiPuttSessionAction,
  calculateDistanceToHole: DistanceToHoleCalculator
): MultiPuttSessionState {
  switch (action.type) {
    case "CONFIRM_PLACEMENT":
      return state.phase === "placement" ? {...state, phase: "aiming"} : state

    case "SET_AIM": {
      if (state.phase !== "aiming") {
        return state
      }
      const aimDirection = normalizeDirection(action.aimDirection)
      return aimDirection ? {...state, aimDirection} : state
    }

    case "START_ROLL": {
      if (state.phase !== "aiming" || state.isHoled) {
        return state
      }
      const aimDirection = normalizeDirection(action.aimDirection)
      if (
        !aimDirection ||
        !isFinitePoint(action.endpoint) ||
        !Number.isFinite(action.nominalDistanceCm) ||
        action.nominalDistanceCm <= 0 ||
        !isTargetZoneResult(action.targetZoneResult)
      ) {
        return state
      }

      return {
        ...state,
        phase: "rolling",
        aimDirection,
        currentNominalDistanceCm: action.nominalDistanceCm,
        activeRoll: {
          startPosition: copyPoint(state.currentPuttStartPosition),
          endpoint: copyPoint(action.endpoint),
          aimDirection: copyDirection(aimDirection),
          nominalDistanceCm: action.nominalDistanceCm,
          targetZoneResult: action.targetZoneResult,
          source: action.source,
        },
        targetZoneResult: null,
      }
    }

    case "COMPLETE_ROLL": {
      if (state.phase !== "rolling" || !state.activeRoll) {
        return state
      }
      const remainingDistanceCm = getDistanceCm(
        state.activeRoll.endpoint,
        state.holePosition,
        calculateDistanceToHole
      )
      if (remainingDistanceCm === null) {
        return state
      }
      const isHoled =
        remainingDistanceCm <= REGULATION_HOLE_RADIUS_CM + COMPARISON_EPSILON_CM
      const lastCompletedPutt: CompletedPuttSnapshot = {
        ...state.activeRoll,
        startPosition: copyPoint(state.activeRoll.startPosition),
        endpoint: copyPoint(state.activeRoll.endpoint),
        aimDirection: copyDirection(state.activeRoll.aimDirection),
        remainingDistanceCm,
        isHoled,
      }

      return {
        ...state,
        phase: isHoled ? "holed" : "result",
        ballPosition: copyPoint(state.activeRoll.endpoint),
        completedPutts: state.completedPutts + 1,
        remainingDistanceCm,
        activeRoll: null,
        lastCompletedPutt,
        targetZoneResult: state.activeRoll.targetZoneResult,
        isHoled,
      }
    }

    case "NEXT_PUTT":
      if (state.phase !== "result" || state.isHoled) {
        return state
      }
      return {
        ...state,
        phase: "aiming",
        currentPuttStartPosition: copyPoint(state.ballPosition),
        currentNominalDistanceCm: state.remainingDistanceCm,
        targetZoneResult: null,
      }

    case "REPLAY_SHOT": {
      if (state.phase !== "result" || !state.lastCompletedPutt || state.isHoled) {
        return state
      }
      const replayStart = copyPoint(state.lastCompletedPutt.startPosition)
      const remainingDistanceCm = getDistanceCm(
        replayStart,
        state.holePosition,
        calculateDistanceToHole
      )
      if (remainingDistanceCm === null) {
        return state
      }
      return {
        ...state,
        phase: "aiming",
        currentPuttStartPosition: replayStart,
        ballPosition: copyPoint(replayStart),
        aimDirection: copyDirection(state.lastCompletedPutt.aimDirection),
        completedPutts: Math.max(0, state.completedPutts - 1),
        remainingDistanceCm,
        currentNominalDistanceCm: state.lastCompletedPutt.nominalDistanceCm,
        activeRoll: null,
        lastCompletedPutt: null,
        targetZoneResult: null,
        isHoled: false,
      }
    }

    case "RESET_SESSION":
      if (state.phase === "rolling") {
        return state
      }
      return createMultiPuttSession({
        ballPosition: state.originalStartPosition,
        holePosition: state.holePosition,
        defaultAimDirection: state.defaultAimDirection,
        nominalDistanceCm: getDistanceCm(
          state.originalStartPosition,
          state.holePosition,
          calculateDistanceToHole
        )!,
      }, calculateDistanceToHole)

    default:
      return state
  }
}
