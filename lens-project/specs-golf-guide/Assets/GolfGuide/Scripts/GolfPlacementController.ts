import {AimDragInteraction} from "./AimDragInteraction"
import {calculateDistanceToHole} from "./DistanceToHole"
import {
  classifyPuttEndpoint,
  PRACTICE_TARGET_ZONE_DIAMETER_CM,
  type PuttClassification,
} from "./GolfOutcome"
import {GolfOutcomeFeedbackUI} from "./GolfOutcomeFeedbackUI"
import {GolfPlacementUI} from "./GolfPlacementUI"
import {
  createGhostCoachFeedback,
  type GhostCoachFeedback,
  type GhostCoachInput,
} from "./GhostCoach"
import {PlacementDragInteraction} from "./PlacementDragInteraction"
import {
  createMultiPuttSession,
  transitionMultiPuttSession,
  type MultiPuttSessionAction,
  type MultiPuttSessionState,
} from "./MultiPuttSession"
import {
  DEFAULT_PRACTICE_RANGE_DISTANCE_FT,
  isPracticeRangeDistanceFt,
  practiceRangeFeetToCentimeters,
  resolvePracticeRangeLifecycleDistance,
  type PracticeRangeDistanceFt,
} from "./PracticeRange"
import {
  VirtualStrokeInteraction,
  type VirtualStrokeCapture,
} from "./VirtualStrokeInteraction"
type PlacementPhase =
  | "initial-placement"
  | "moving-setup"
  | "aiming"
  | "rolling"
  | "result"
  | "holed"
type RollSource = "quick-putt" | "virtual-stroke"
const PUTT_ROLL_DURATION_SECONDS = 1.5
/**
 * Lens adapter for the already-tested ACTIVATE_MOVE_SETUP,
 * MOVE_PLACEMENT_HANDLE, and CONFIRM_PLACEMENT reducer actions.
 */
@component
export class GolfPlacementController extends BaseScriptComponent {
  @input
  puttingSetupRoot!: SceneObject
  @input
  placementHandle!: SceneObject
  @input
  dragInteraction!: PlacementDragInteraction
  @input
  placementUI!: GolfPlacementUI
  @input
  aimLineAnchor!: SceneObject
  @input
  aimHandle!: SceneObject
  @input
  aimDragInteraction!: AimDragInteraction
  @input
  targetAnchor!: SceneObject
  @input
  @hint("The existing golf-ball visual moved during the deterministic putt roll")
  ballVisual!: SceneObject
  @input
  @hint("Target-adjacent UIKit result shown after the roll completes")
  outcomeFeedback!: GolfOutcomeFeedbackUI
  @input
  @hint("SIK-compatible virtual-stroke handle shown during the aiming phase")
  strokeHandle!: SceneObject
  @input
  @hint("Transient virtual-stroke input bridge attached to the stroke handle")
  strokeInteraction!: VirtualStrokeInteraction
  private phase: PlacementPhase = "initial-placement"
  private aimAdjustmentActive = false
  private aimDirection = new vec3(0, 0, -1)
  private targetPositionAtAimStart = vec3.zero()
  private rollStartPosition = vec3.zero()
  private rollEndPosition = vec3.zero()
  private targetPositionAtRollStart = vec3.zero()
  private rollElapsedSeconds = 0
  private midpointLogged = false
  private rollCompletionDispatched = false
  private rollSource: RollSource = "quick-putt"
  private rollStrength = 1
  private initialSetupLocalPosition = vec3.zero()
  private initialBallLocalPosition = vec3.zero()
  private initialTargetLocalPosition = vec3.zero()
  private initialAimLineLocalPosition = vec3.zero()
  private initialAimLineLocalRotation = quat.quatIdentity()
  private initialAimHandleLocalPosition = vec3.zero()
  private initialPlacementHandleLocalPosition = vec3.zero()
  private initialStrokeHandleLocalPosition = vec3.zero()
  private initialAimLineWorldOffsetFromBall = vec3.zero()
  private initialStrokeHandleWorldOffsetFromBall = vec3.zero()
  private selectedPracticeDistanceFt: PracticeRangeDistanceFt =
    DEFAULT_PRACTICE_RANGE_DISTANCE_FT
  private authoredRangeDistanceCm = 150
  private fixedRangeDirectionLocal = new vec3(0, 0, -1)
  private guideDirectionLocal = new vec3(0, 0, -1)
  private aimLineVisual: SceneObject | null = null
  private aimArrowVisual: SceneObject | null = null
  private initialAimLineVisualLocalPosition = vec3.zero()
  private initialAimLineVisualLocalScale = new vec3(1, 1, 1)
  private initialAimArrowLocalPosition = vec3.zero()
  private pendingGhostCoachInput: Omit<GhostCoachInput, "classification"> | null =
    null
  private completedGhostCoach: GhostCoachFeedback | null = null
  private completedOutcome: PuttClassification | null = null
  private multiPuttSession: MultiPuttSessionState | null = null
  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.updateRoll())
    this.createEvent("OnStartEvent").bind(() => {
      this.dragInteraction.setInteractionEnabled(true)
      this.aimDragInteraction.setInteractionEnabled(false)
      this.strokeInteraction.setInteractionEnabled(false)
      this.strokeInteraction.setAimDirection(this.aimDirection)
      this.placementHandle.enabled = true
      this.aimHandle.enabled = false
      this.strokeHandle.enabled = false
      this.captureInitialArrangement()
      this.outcomeFeedback.hide()
      this.placementUI.onConfirmPlacement.add(() => this.confirmPlacement())
      this.placementUI.onAdjustAim.add(() => this.activateAdjustAim())
      this.placementUI.onPrepareManualStroke.add(() =>
        this.prepareManualStroke()
      )
      this.placementUI.onPracticePutt.add(() => this.startPracticePutt())
      this.placementUI.onNextPutt.add(() => this.nextPutt())
      this.placementUI.onReplayShot.add(() => this.replayShot())
      this.placementUI.onResetSession.add(() => this.resetSession())
      this.placementUI.onPracticeDistanceSelected.add((distanceFt) =>
        this.selectPracticeDistance(distanceFt)
      )
      this.placementUI.onContextualViewChanged.add((contextual) =>
        this.handleContextualViewChanged(contextual)
      )
      this.dragInteraction.onDragUpdate.add((position) => this.handlePlacementUpdate(position))
      this.dragInteraction.onHoverChanged.add((hovered) =>
        this.placementUI.setPlacementHandleHovered(hovered)
      )
      this.dragInteraction.onDragStart.add(() => this.beginDirectPlacementDrag())
      this.dragInteraction.onDragEnd.add(() =>
        this.placementUI.setPlacementHandleActive(false)
      )
      this.aimDragInteraction.onDragUpdate.add((direction) => this.handleAimUpdate(direction))
      this.strokeInteraction.onStrokeCaptured.add((capture) =>
        this.handleVirtualStroke(capture)
      )
      this.applyPracticeDistance(this.selectedPracticeDistanceFt)
      this.initializeMultiPuttSession("placement")
      print("[GolfPlacement] ready: initial-placement")
    })
  }

  private beginDirectPlacementDrag(): void {
    if (this.phase !== "initial-placement" && this.phase !== "moving-setup") {
      return
    }
    if (this.phase === "initial-placement") {
      this.phase = "moving-setup"
      print("[GolfPlacement] action=DIRECT_MOVE_SETUP phase=moving-setup")
    }
    this.placementUI.setPlacementHandleActive(true)
  }

  private handlePlacementUpdate(worldPosition: vec3): void {
    if (this.phase !== "moving-setup") {
      return
    }

    const localPosition = this.puttingSetupRoot.getTransform().getLocalPosition()
    print(
      `[GolfPlacement] action=MOVE_PLACEMENT_HANDLE offset=(${localPosition.x.toFixed(2)},${(
        -localPosition.z
      ).toFixed(2)}) world=(${worldPosition.x.toFixed(2)},${worldPosition.y.toFixed(
        2
      )},${worldPosition.z.toFixed(2)})`
    )
  }

  private confirmPlacement(): void {
    if (this.phase !== "initial-placement" && this.phase !== "moving-setup") {
      return
    }

    if (!this.initializeMultiPuttSession("aiming")) {
      return
    }

    this.phase = "aiming"
    this.aimAdjustmentActive = false
    this.dragInteraction.setInteractionEnabled(false)
    this.aimDragInteraction.setInteractionEnabled(false)
    this.placementHandle.enabled = false
    this.aimHandle.enabled = false
    this.strokeHandle.enabled = true
    this.strokeInteraction.prepareForStroke(
      this.ballVisual.getTransform().getWorldPosition(),
      this.aimDirection
    )
    this.placementUI.showConfirmed()

    const position = this.puttingSetupRoot.getTransform().getLocalPosition()
    print(
      `[GolfPlacement] action=CONFIRM_PLACEMENT phase=aiming setup=(${position.x.toFixed(
        2
      )},${position.y.toFixed(2)},${position.z.toFixed(2)})`
    )
  }

  private activateAdjustAim(): void {
    if (this.phase !== "aiming" || this.aimAdjustmentActive) {
      return
    }

    this.aimAdjustmentActive = true
    this.targetPositionAtAimStart = this.targetAnchor.getTransform().getWorldPosition()
    this.aimHandle.enabled = true
    this.aimDragInteraction.setInteractionEnabled(true)
    this.placementUI.showAimMode()
    print("[GolfAim] action=ACTIVATE_ADJUST_AIM mode=adjusting-aim")
  }

  private handleAimUpdate(direction: vec3): void {
    if (!this.aimAdjustmentActive || this.phase !== "aiming") {
      return
    }

    const planar = new vec3(direction.x, 0, direction.z)
    if (
      !Number.isFinite(planar.x) ||
      !Number.isFinite(planar.z) ||
      planar.length <= 0.0001
    ) {
      return
    }

    this.aimDirection = planar.normalize()
    this.transitionMultiPutt({
      type: "SET_AIM",
      aimDirection: {x: this.aimDirection.x, z: this.aimDirection.z},
    })
    this.strokeInteraction.setAimDirection(this.aimDirection)
    const yaw = Math.atan2(-this.aimDirection.x, -this.aimDirection.z)
    this.aimLineAnchor
      .getTransform()
      .setLocalRotation(quat.fromEulerAngles(0, yaw, 0))

    const targetPosition = this.targetAnchor.getTransform().getWorldPosition()
    const targetStable = targetPosition.distance(this.targetPositionAtAimStart) < 0.001
    print(
      `[GolfAim] action=MOVE_AIMING_HANDLE direction=(${this.aimDirection.x.toFixed(
        4
      )},${(-this.aimDirection.z).toFixed(4)}) yawDeg=${(
        yaw * MathUtils.RadToDeg
      ).toFixed(2)} targetStable=${targetStable}`
    )
  }

  private selectPracticeDistance(distanceFt: number): void {
    if (
      (this.phase !== "initial-placement" && this.phase !== "moving-setup") ||
      !isPracticeRangeDistanceFt(distanceFt)
    ) {
      return
    }

    this.applyPracticeDistance(distanceFt)
    this.initializeMultiPuttSession("placement")
    const distanceCm = practiceRangeFeetToCentimeters(distanceFt)
    console.log(
      `[GolfRange] action=SELECT_DISTANCE phase=${this.phase} distanceFt=${distanceFt} distanceCm=${distanceCm.toFixed(2)} target=${this.formatPosition(
        this.targetAnchor.getTransform().getWorldPosition()
      )} aimGuideCm=${distanceCm.toFixed(2)}`
    )
  }

  private applyPracticeDistance(distanceFt: PracticeRangeDistanceFt): void {
    this.selectedPracticeDistanceFt = distanceFt
    const distanceCm = practiceRangeFeetToCentimeters(distanceFt)

    const targetLocalPosition = this.initialAimLineLocalPosition.add(
      this.fixedRangeDirectionLocal.uniformScale(distanceCm)
    )
    this.targetAnchor.getTransform().setLocalPosition(targetLocalPosition)

    this.applyGuideDistance(distanceCm)

    if (this.aimAdjustmentActive) {
      this.targetPositionAtAimStart =
        this.targetAnchor.getTransform().getWorldPosition()
    }
    this.placementUI.setPracticeDistance(distanceFt)
    this.refreshDistanceToHole()
  }

  private applyGuideDistance(distanceCm: number): void {
    if (this.aimLineVisual) {
      const linePosition = this.initialAimLineVisualLocalPosition
        .sub(this.guideDirectionLocal.uniformScale(
          this.authoredRangeDistanceCm / 2
        ))
        .add(this.guideDirectionLocal.uniformScale(distanceCm / 2))
      const lineScale = this.initialAimLineVisualLocalScale
      this.aimLineVisual.getTransform().setLocalPosition(linePosition)
      this.aimLineVisual.getTransform().setLocalScale(
        new vec3(
          lineScale.x,
          lineScale.y,
          lineScale.z *
            (distanceCm / this.authoredRangeDistanceCm)
        )
      )
    }

    if (this.aimArrowVisual) {
      const arrowPosition = this.initialAimArrowLocalPosition
        .sub(this.guideDirectionLocal.uniformScale(
          this.authoredRangeDistanceCm
        ))
        .add(this.guideDirectionLocal.uniformScale(distanceCm))
      this.aimArrowVisual.getTransform().setLocalPosition(arrowPosition)
    }

    const aimHandlePosition = this.initialAimHandleLocalPosition
      .sub(this.guideDirectionLocal.uniformScale(
        this.authoredRangeDistanceCm
      ))
      .add(this.guideDirectionLocal.uniformScale(distanceCm))
    this.aimHandle.getTransform().setLocalPosition(aimHandlePosition)
  }

  private startPracticePutt(): void {
    if (this.phase !== "aiming" || this.rollCompletionDispatched) {
      return
    }

    const planar = new vec3(this.aimDirection.x, 0, this.aimDirection.z)
    if (planar.length <= 0.0001) {
      return
    }

    const direction = planar.normalize()
    const startPosition = this.ballVisual.getTransform().getWorldPosition()
    const selectedPracticeDistanceCm =
      this.multiPuttSession?.currentNominalDistanceCm ??
      practiceRangeFeetToCentimeters(this.selectedPracticeDistanceFt)
    const endpoint = new vec3(
      startPosition.x + direction.x * selectedPracticeDistanceCm,
      startPosition.y,
      startPosition.z + direction.z * selectedPracticeDistanceCm
    )
    this.beginRoll(endpoint, direction, "quick-putt", 1)
  }

  private handleVirtualStroke(capture: VirtualStrokeCapture): void {
    if (this.phase !== "aiming" || this.rollCompletionDispatched) {
      return
    }

    this.pendingGhostCoachInput = {
      aimDeviation: capture.outcome.aimDeviation,
      distanceFeedback: capture.outcome.distanceFeedback,
      selectedDistanceCm:
        this.multiPuttSession?.currentNominalDistanceCm ??
        practiceRangeFeetToCentimeters(this.selectedPracticeDistanceFt),
      travelDistanceCm: capture.outcome.travelDistanceCm,
    }

    this.beginRoll(
      capture.endpoint,
      capture.direction,
      "virtual-stroke",
      capture.strength
    )
  }

  private prepareManualStroke(): void {
    if (
      this.phase !== "aiming" ||
      !this.multiPuttSession ||
      this.multiPuttSession.phase !== "aiming"
    ) {
      console.warn(
        `[GolfPhase] action=PREPARE_MANUAL_STROKE rejected controller=${this.phase} session=${this.multiPuttSession?.phase ?? "missing"}`
      )
      return
    }

    this.aimAdjustmentActive = false
    this.aimDragInteraction.setInteractionEnabled(false)
    this.aimHandle.enabled = false
    this.strokeHandle.enabled = true
    const interactionReady = this.strokeInteraction.prepareForStroke(
      this.ballVisual.getTransform().getWorldPosition(),
      this.aimDirection
    )
    this.placementUI.showManualStrokeReady()
    this.verifyPhaseSynchronization("PREPARE_MANUAL_STROKE")
    console.log(
      `[GolfStroke] action=PREPARE_MANUAL_STROKE label=${
        this.multiPuttSession.completedPutts > 0 ? "Putt Again" : "Stroke Putt"
      } instruction="Drag ring back, then stroke forward" autoShot=false interactionReady=${interactionReady}`
    )
  }

  private beginRoll(
    endpoint: vec3,
    direction: vec3,
    source: RollSource,
    strength: number
  ): void {
    if (
      this.phase !== "aiming" ||
      this.rollCompletionDispatched ||
      !Number.isFinite(endpoint.x) ||
      !Number.isFinite(endpoint.z) ||
      !Number.isFinite(strength) ||
      strength < 0
    ) {
      return
    }

    this.rollStartPosition = this.ballVisual.getTransform().getWorldPosition()
    this.rollEndPosition = new vec3(
      endpoint.x,
      this.rollStartPosition.y,
      endpoint.z
    )
    this.rollSource = source
    this.rollStrength = strength
    const pendingOutcome = classifyPuttEndpoint(
      this.rollEndPosition,
      this.targetAnchor.getTransform().getWorldPosition(),
      this.rollStartPosition
    )
    if (
      !this.transitionMultiPutt({
        type: "START_ROLL",
        endpoint: this.toWorldPoint(this.rollEndPosition),
        aimDirection: {x: direction.x, z: direction.z},
        nominalDistanceCm:
          this.multiPuttSession?.currentNominalDistanceCm ??
          this.rollStartPosition.distance(this.targetAnchor.getTransform().getWorldPosition()),
        targetZoneResult: pendingOutcome.classification,
        source,
      })
    ) {
      return
    }
    if (source !== "virtual-stroke") {
      this.pendingGhostCoachInput = null
    }
    this.completedGhostCoach = null
    this.completedOutcome = null
    this.targetPositionAtRollStart = this.targetAnchor.getTransform().getWorldPosition()
    this.rollElapsedSeconds = 0
    this.midpointLogged = false
    this.rollCompletionDispatched = false
    this.phase = "rolling"
    this.aimAdjustmentActive = false
    this.aimDragInteraction.setInteractionEnabled(false)
    this.strokeInteraction.setInteractionEnabled(false)
    this.aimHandle.enabled = false
    this.strokeHandle.enabled = false
    this.outcomeFeedback.hide()
    this.placementUI.showRolling()

    console.log(
      `[GolfPutt] action=${source === "virtual-stroke" ? "VIRTUAL_STROKE" : "PRACTICE_PUTT"} phase=rolling source=${source} duration=${PUTT_ROLL_DURATION_SECONDS.toFixed(2)} distance=${this.rollStartPosition.distance(this.rollEndPosition).toFixed(2)} strength=${strength.toFixed(3)} start=${this.formatPosition(this.rollStartPosition)} endpoint=${this.formatPosition(this.rollEndPosition)} direction=(${direction.x.toFixed(4)},${direction.z.toFixed(4)})`
    )
  }

  private updateRoll(): void {
    if (this.phase !== "rolling" || this.rollCompletionDispatched) {
      return
    }

    this.rollElapsedSeconds = Math.min(
      PUTT_ROLL_DURATION_SECONDS,
      this.rollElapsedSeconds + Math.max(0, getDeltaTime())
    )
    const progress = this.rollElapsedSeconds / PUTT_ROLL_DURATION_SECONDS
    const position = new vec3(
      this.rollStartPosition.x +
        (this.rollEndPosition.x - this.rollStartPosition.x) * progress,
      this.rollStartPosition.y,
      this.rollStartPosition.z +
        (this.rollEndPosition.z - this.rollStartPosition.z) * progress
    )
    this.ballVisual.getTransform().setWorldPosition(position)

    if (!this.midpointLogged && progress >= 0.5) {
      this.midpointLogged = true
      console.log(
        `[GolfPutt] sample=midpoint elapsed=${this.rollElapsedSeconds.toFixed(3)} progress=${progress.toFixed(3)} position=${this.formatPosition(position)}`
      )
    }

    if (this.rollElapsedSeconds < PUTT_ROLL_DURATION_SECONDS) {
      return
    }

    this.ballVisual.getTransform().setWorldPosition(this.rollEndPosition)
    if (!this.transitionMultiPutt({type: "COMPLETE_ROLL"})) {
      console.error("[GolfSession] COMPLETE_ROLL rejected by multi-putt state")
      return
    }
    this.rollCompletionDispatched = true
    this.phase = this.multiPuttSession!.isHoled ? "holed" : "result"

    const targetPosition = this.targetAnchor.getTransform().getWorldPosition()
    const outcome = classifyPuttEndpoint(
      this.rollEndPosition,
      targetPosition,
      this.rollStartPosition
    )
    this.refreshDistanceToHole()
    if (this.multiPuttSession!.isHoled) {
      this.completedOutcome = null
      this.completedGhostCoach = null
      this.pendingGhostCoachInput = null
      this.outcomeFeedback.hide()
      this.placementUI.showHoled(this.multiPuttSession!.completedPutts)
      this.verifyPhaseSynchronization("COMPLETE_ROLL_HOLED")
      const targetStable =
        targetPosition.distance(this.targetPositionAtRollStart) < 0.001
      console.log(
        `[GolfPutt] action=COMPLETE_ROLL phase=holed source=${this.rollSource} putts=${this.multiPuttSession!.completedPutts} remainingCm=${this.multiPuttSession!.remainingDistanceCm.toFixed(2)} elapsed=${this.rollElapsedSeconds.toFixed(3)} position=${this.formatPosition(this.rollEndPosition)} targetStable=${targetStable}`
      )
      return
    }
    this.placementUI.showRollComplete(outcome.classification)
    this.verifyPhaseSynchronization("COMPLETE_ROLL_RESULT")
    this.completedOutcome = outcome.classification
    if (this.rollSource === "virtual-stroke" && this.pendingGhostCoachInput) {
      this.completedGhostCoach = createGhostCoachFeedback({
        classification: outcome.classification,
        ...this.pendingGhostCoachInput,
      })
      this.outcomeFeedback.showGhostCoach(this.completedGhostCoach)
      console.log(
        `[GhostCoach] outcome=${this.completedGhostCoach.outcome} classification=${this.completedGhostCoach.classification} summary=${this.completedGhostCoach.summary} tip=${this.completedGhostCoach.tip}`
      )
    } else {
      this.completedGhostCoach = null
      this.outcomeFeedback.showOutcome(outcome.classification)
    }
    this.pendingGhostCoachInput = null
    const targetStable = targetPosition.distance(this.targetPositionAtRollStart) < 0.001
    console.log(
      `[GolfPutt] action=COMPLETE_ROLL phase=result source=${this.rollSource} strength=${this.rollStrength.toFixed(3)} outcome=${outcome.classification} endpointErrorCm=${outcome.distanceFromTargetCm.toFixed(2)} targetZoneDiameterCm=${PRACTICE_TARGET_ZONE_DIAMETER_CM.toFixed(2)} elapsed=${this.rollElapsedSeconds.toFixed(3)} position=${this.formatPosition(this.rollEndPosition)} targetStable=${targetStable}`
    )
  }

  private nextPutt(): void {
    if (this.phase !== "result") {
      return
    }
    const direction = this.getDirectionFromBallToHole()
    if (!direction) {
      return
    }
    if (!this.transitionMultiPutt({type: "NEXT_PUTT"})) {
      return
    }
    this.aimDirection = direction
    this.transitionMultiPutt({
      type: "SET_AIM",
      aimDirection: {x: direction.x, z: direction.z},
    })
    this.rebaseCurrentPuttVisuals(
      this.multiPuttSession!.currentNominalDistanceCm,
      direction
    )
    if (!this.enterAimingForCurrentPutt()) {
      return
    }
    console.log(
      `[GolfSession] action=NEXT_PUTT phase=aiming putts=${this.multiPuttSession!.completedPutts} ball=${this.formatPosition(this.ballVisual.getTransform().getWorldPosition())} remainingCm=${this.multiPuttSession!.remainingDistanceCm.toFixed(2)} targetFixed=${this.formatPosition(this.targetAnchor.getTransform().getWorldPosition())}`
    )
  }

  private replayShot(): void {
    if (this.phase !== "result") {
      return
    }
    if (!this.transitionMultiPutt({type: "REPLAY_SHOT"})) {
      return
    }
    const state = this.multiPuttSession!
    this.ballVisual
      .getTransform()
      .setWorldPosition(this.fromWorldPoint(state.ballPosition))
    this.aimDirection = new vec3(
      state.aimDirection.x,
      0,
      state.aimDirection.z
    )
    this.rebaseCurrentPuttVisuals(
      state.currentNominalDistanceCm,
      this.aimDirection
    )
    if (!this.enterAimingForCurrentPutt()) {
      return
    }
    console.log(
      `[GolfSession] action=REPLAY_SHOT phase=aiming putts=${state.completedPutts} ball=${this.formatPosition(this.ballVisual.getTransform().getWorldPosition())} nominalCm=${state.currentNominalDistanceCm.toFixed(2)} feedbackCleared=true`
    )
  }

  private enterAimingForCurrentPutt(): boolean {
    if (!this.multiPuttSession || this.multiPuttSession.phase !== "aiming") {
      console.error(
        `[GolfPhase] enter-aiming rejected session=${this.multiPuttSession?.phase ?? "missing"}`
      )
      return false
    }
    this.phase = "aiming"
    this.aimAdjustmentActive = false
    this.rollElapsedSeconds = 0
    this.midpointLogged = false
    this.rollCompletionDispatched = false
    this.dragInteraction.setInteractionEnabled(false)
    this.aimDragInteraction.setInteractionEnabled(false)
    this.placementHandle.enabled = false
    this.aimHandle.enabled = false
    this.strokeHandle.enabled = true
    const interactionReady = this.strokeInteraction.prepareForStroke(
      this.ballVisual.getTransform().getWorldPosition(),
      this.aimDirection
    )
    this.outcomeFeedback.hide()
    this.pendingGhostCoachInput = null
    this.completedGhostCoach = null
    this.completedOutcome = null
    this.refreshDistanceToHole()
    this.placementUI.showNextPuttReady()
    const phaseSynchronized = this.verifyPhaseSynchronization(
      "ENTER_NEXT_PUTT_AIMING"
    )
    if (!interactionReady) {
      console.error("[GolfStrokeInput] unable to rearm for current putt")
    }
    return interactionReady && phaseSynchronized
  }

  private resetSession(): void {
    if (this.phase === "rolling") {
      return
    }

    this.puttingSetupRoot
      .getTransform()
      .setLocalPosition(this.initialSetupLocalPosition)
    this.ballVisual.getTransform().setLocalPosition(this.initialBallLocalPosition)
    this.targetAnchor
      .getTransform()
      .setLocalPosition(this.initialTargetLocalPosition)
    this.aimLineAnchor
      .getTransform()
      .setLocalPosition(this.initialAimLineLocalPosition)
    this.aimLineAnchor
      .getTransform()
      .setLocalRotation(this.initialAimLineLocalRotation)
    this.aimHandle
      .getTransform()
      .setLocalPosition(this.initialAimHandleLocalPosition)
    this.placementHandle
      .getTransform()
      .setLocalPosition(this.initialPlacementHandleLocalPosition)
    this.strokeHandle
      .getTransform()
      .setLocalPosition(this.initialStrokeHandleLocalPosition)
    this.strokeInteraction.setRestWorldPosition(
      this.strokeHandle.getTransform().getWorldPosition()
    )
    this.strokeInteraction.setBallWorldPosition(
      this.ballVisual.getTransform().getWorldPosition()
    )
    this.applyPracticeDistance(
      resolvePracticeRangeLifecycleDistance(
        this.selectedPracticeDistanceFt,
        "reset-all"
      )
    )

    this.phase = "initial-placement"
    this.aimAdjustmentActive = false
    this.aimDirection = new vec3(0, 0, -1)
    this.rollStartPosition = this.ballVisual.getTransform().getWorldPosition()
    this.rollEndPosition = this.rollStartPosition
    this.rollElapsedSeconds = 0
    this.midpointLogged = false
    this.rollCompletionDispatched = false
    this.rollSource = "quick-putt"
    this.rollStrength = 1
    this.pendingGhostCoachInput = null
    this.completedGhostCoach = null
    this.completedOutcome = null
    this.dragInteraction.setInteractionEnabled(true)
    this.aimDragInteraction.setInteractionEnabled(false)
    this.strokeInteraction.setInteractionEnabled(false)
    this.strokeInteraction.setAimDirection(this.aimDirection)
    this.placementHandle.enabled = true
    this.aimHandle.enabled = false
    this.strokeHandle.enabled = false
    this.outcomeFeedback.hide()
    this.placementUI.showInitialPlacement()
    this.initializeMultiPuttSession("placement")

    console.log(
      `[GolfSession] action=RESET_SESSION phase=initial-placement setup=${this.formatPosition(
        this.initialSetupLocalPosition
      )} ball=${this.formatPosition(
        this.ballVisual.getTransform().getWorldPosition()
      )} target=${this.formatPosition(
        this.targetAnchor.getTransform().getWorldPosition()
      )} aim=(0.0000,-1.0000) distanceFt=${this.selectedPracticeDistanceFt} distanceCm=${practiceRangeFeetToCentimeters(
        this.selectedPracticeDistanceFt
      ).toFixed(2)} feedbackCleared=true`
    )
  }

  private captureInitialArrangement(): void {
    this.initialSetupLocalPosition =
      this.puttingSetupRoot.getTransform().getLocalPosition()
    this.initialBallLocalPosition =
      this.ballVisual.getTransform().getLocalPosition()
    this.initialTargetLocalPosition =
      this.targetAnchor.getTransform().getLocalPosition()
    this.initialAimLineLocalPosition =
      this.aimLineAnchor.getTransform().getLocalPosition()
    this.initialAimLineLocalRotation =
      this.aimLineAnchor.getTransform().getLocalRotation()
    this.initialAimHandleLocalPosition =
      this.aimHandle.getTransform().getLocalPosition()
    this.initialPlacementHandleLocalPosition =
      this.placementHandle.getTransform().getLocalPosition()
    this.initialStrokeHandleLocalPosition =
      this.strokeHandle.getTransform().getLocalPosition()

    const initialBallWorldPosition =
      this.ballVisual.getTransform().getWorldPosition()
    this.initialAimLineWorldOffsetFromBall = this.aimLineAnchor
      .getTransform()
      .getWorldPosition()
      .sub(initialBallWorldPosition)
    this.initialStrokeHandleWorldOffsetFromBall = this.strokeHandle
      .getTransform()
      .getWorldPosition()
      .sub(initialBallWorldPosition)

    const fixedRange = this.initialTargetLocalPosition.sub(
      this.initialAimLineLocalPosition
    )
    if (fixedRange.length > 0.0001) {
      this.authoredRangeDistanceCm = fixedRange.length
      this.fixedRangeDirectionLocal = fixedRange.normalize()
    }

    this.aimLineVisual = this.findDescendantByName(
      this.aimLineAnchor,
      "AimLine_Visual"
    )
    this.aimArrowVisual = this.findDescendantByName(
      this.aimLineAnchor,
      "AimArrow_Visual"
    )
    if (this.aimLineVisual) {
      this.initialAimLineVisualLocalPosition =
        this.aimLineVisual.getTransform().getLocalPosition()
      this.initialAimLineVisualLocalScale =
        this.aimLineVisual.getTransform().getLocalScale()
    }
    if (this.aimArrowVisual) {
      this.initialAimArrowLocalPosition =
        this.aimArrowVisual.getTransform().getLocalPosition()
      const guideDirection = new vec3(
        this.initialAimArrowLocalPosition.x,
        0,
        this.initialAimArrowLocalPosition.z
      )
      if (guideDirection.length > 0.0001) {
        this.guideDirectionLocal = guideDirection.normalize()
      }
    }
  }

  private initializeMultiPuttSession(
    startPhase: "placement" | "aiming"
  ): boolean {
    const ballPosition = this.ballVisual.getTransform().getWorldPosition()
    const holePosition = this.targetAnchor.getTransform().getWorldPosition()
    const distance = calculateDistanceToHole(ballPosition, holePosition)
    if (!distance || distance.centimeters <= 0) {
      console.error("[GolfSession] unable to initialize multi-putt geometry")
      return false
    }

    try {
      this.multiPuttSession = createMultiPuttSession(
        {
          ballPosition: this.toWorldPoint(ballPosition),
          holePosition: this.toWorldPoint(holePosition),
          defaultAimDirection: {
            x: this.aimDirection.x,
            z: this.aimDirection.z,
          },
          nominalDistanceCm: distance.centimeters,
          startPhase,
        },
        calculateDistanceToHole
      )
    } catch (error) {
      console.error(`[GolfSession] initialization failed: ${error}`)
      return false
    }
    this.placementUI.setCompletedPutts(0)
    this.refreshDistanceToHole()
    return true
  }

  private transitionMultiPutt(action: MultiPuttSessionAction): boolean {
    if (!this.multiPuttSession) {
      return false
    }
    const next = transitionMultiPuttSession(
      this.multiPuttSession,
      action,
      calculateDistanceToHole
    )
    if (next === this.multiPuttSession) {
      return false
    }
    this.multiPuttSession = next
    this.placementUI.setCompletedPutts(next.completedPutts)
    return true
  }

  private verifyPhaseSynchronization(context: string): boolean {
    if (!this.multiPuttSession) {
      console.error(`[GolfPhase] context=${context} session=missing`)
      return false
    }
    const controllerPhase =
      this.phase === "initial-placement" || this.phase === "moving-setup"
        ? "placement"
        : this.phase
    const menuPhase = this.placementUI.getCurrentMenuPhase()
    const synchronized =
      controllerPhase === this.multiPuttSession.phase &&
      menuPhase === this.multiPuttSession.phase
    const message = `[GolfPhase] context=${context} controller=${controllerPhase} session=${this.multiPuttSession.phase} menu=${menuPhase} synchronized=${synchronized}`
    if (synchronized) {
      console.log(message)
    } else {
      console.error(message)
    }
    return synchronized
  }

  private rebaseCurrentPuttVisuals(
    distanceCm: number,
    direction: vec3
  ): void {
    const ballPosition = this.ballVisual.getTransform().getWorldPosition()
    this.aimLineAnchor
      .getTransform()
      .setWorldPosition(ballPosition.add(this.initialAimLineWorldOffsetFromBall))
    const yaw = Math.atan2(-direction.x, -direction.z)
    this.aimLineAnchor
      .getTransform()
      .setLocalRotation(quat.fromEulerAngles(0, yaw, 0))
    this.applyGuideDistance(distanceCm)

    const strokeRestPosition = ballPosition.add(
      this.initialStrokeHandleWorldOffsetFromBall
    )
    this.strokeInteraction.setRestWorldPosition(strokeRestPosition)
    this.strokeInteraction.setBallWorldPosition(ballPosition)
    this.strokeInteraction.setAimDirection(direction)
  }

  private getDirectionFromBallToHole(): vec3 | null {
    const ballPosition = this.ballVisual.getTransform().getWorldPosition()
    const holePosition = this.targetAnchor.getTransform().getWorldPosition()
    const direction = new vec3(
      holePosition.x - ballPosition.x,
      0,
      holePosition.z - ballPosition.z
    )
    return direction.length > 0.0001 ? direction.normalize() : null
  }

  private toWorldPoint(position: vec3): {x: number; y: number; z: number} {
    return {x: position.x, y: position.y, z: position.z}
  }

  private fromWorldPoint(position: {
    x: number
    y: number
    z: number
  }): vec3 {
    return new vec3(position.x, position.y, position.z)
  }

  private refreshDistanceToHole(): void {
    const distance = calculateDistanceToHole(
      this.ballVisual.getTransform().getWorldPosition(),
      this.targetAnchor.getTransform().getWorldPosition()
    )
    this.placementUI.setDistanceToHoleFeet(distance?.feet ?? null)
  }

  private handleContextualViewChanged(contextual: boolean): void {
    if (!contextual) {
      this.outcomeFeedback.hide()
      return
    }
    if (this.phase !== "result" || !this.completedOutcome) {
      return
    }
    if (this.completedGhostCoach) {
      this.outcomeFeedback.showGhostCoach(this.completedGhostCoach)
    } else {
      this.outcomeFeedback.showOutcome(this.completedOutcome)
    }
  }

  private findDescendantByName(
    root: SceneObject,
    name: string
  ): SceneObject | null {
    if (root.name === name) {
      return root
    }
    for (let index = 0; index < root.getChildrenCount(); index += 1) {
      const match = this.findDescendantByName(root.getChild(index), name)
      if (match) {
        return match
      }
    }
    return null
  }

  private formatPosition(position: vec3): string {
    return `(${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)})`
  }
}
