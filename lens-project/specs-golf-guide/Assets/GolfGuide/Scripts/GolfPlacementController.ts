import {AimDragInteraction} from "./AimDragInteraction"
import {
  classifyPuttEndpoint,
  PRACTICE_TARGET_ZONE_DIAMETER_CM,
} from "./GolfOutcome"
import {GolfOutcomeFeedbackUI} from "./GolfOutcomeFeedbackUI"
import {GolfPlacementUI} from "./GolfPlacementUI"
import {PlacementDragInteraction} from "./PlacementDragInteraction"
type PlacementPhase =
  | "initial-placement"
  | "moving-setup"
  | "aiming"
  | "rolling"
  | "result"
const PUTT_TRAVEL_DISTANCE_CM = 150
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
  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.updateRoll())
    this.createEvent("OnStartEvent").bind(() => {
      this.dragInteraction.setInteractionEnabled(false)
      this.aimDragInteraction.setInteractionEnabled(false)
      this.placementHandle.enabled = true
      this.aimHandle.enabled = false
      this.outcomeFeedback.hide()
      this.placementUI.onMoveSetup.add(() => this.activateMoveSetup())
      this.placementUI.onConfirmPlacement.add(() => this.confirmPlacement())
      this.placementUI.onAdjustAim.add(() => this.activateAdjustAim())
      this.placementUI.onPracticePutt.add(() => this.startPracticePutt())
      this.dragInteraction.onDragUpdate.add((position) => this.handlePlacementUpdate(position))
      this.aimDragInteraction.onDragUpdate.add((direction) => this.handleAimUpdate(direction))
      print("[GolfPlacement] ready: initial-placement")
    })
  }

  private activateMoveSetup(): void {
    if (this.phase !== "initial-placement" && this.phase !== "moving-setup") {
      return
    }

    this.phase = "moving-setup"
    this.dragInteraction.setInteractionEnabled(true)
    this.placementUI.showMoveMode()
    print("[GolfPlacement] action=ACTIVATE_MOVE_SETUP phase=moving-setup")
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

    this.phase = "aiming"
    this.aimAdjustmentActive = false
    this.dragInteraction.setInteractionEnabled(false)
    this.aimDragInteraction.setInteractionEnabled(false)
    this.placementHandle.enabled = false
    this.aimHandle.enabled = false
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

  private startPracticePutt(): void {
    if (this.phase !== "aiming" || this.rollCompletionDispatched) {
      return
    }

    const planar = new vec3(this.aimDirection.x, 0, this.aimDirection.z)
    if (planar.length <= 0.0001) {
      return
    }

    const direction = planar.normalize()
    this.rollStartPosition = this.ballVisual.getTransform().getWorldPosition()
    this.rollEndPosition = new vec3(
      this.rollStartPosition.x + direction.x * PUTT_TRAVEL_DISTANCE_CM,
      this.rollStartPosition.y,
      this.rollStartPosition.z + direction.z * PUTT_TRAVEL_DISTANCE_CM
    )
    this.targetPositionAtRollStart = this.targetAnchor.getTransform().getWorldPosition()
    this.rollElapsedSeconds = 0
    this.midpointLogged = false
    this.rollCompletionDispatched = false
    this.phase = "rolling"
    this.aimAdjustmentActive = false
    this.aimDragInteraction.setInteractionEnabled(false)
    this.aimHandle.enabled = false
    this.outcomeFeedback.hide()
    this.placementUI.showRolling()

    console.log(
      `[GolfPutt] action=PRACTICE_PUTT phase=rolling duration=${PUTT_ROLL_DURATION_SECONDS.toFixed(2)} distance=${PUTT_TRAVEL_DISTANCE_CM.toFixed(2)} start=${this.formatPosition(this.rollStartPosition)} endpoint=${this.formatPosition(this.rollEndPosition)} direction=(${direction.x.toFixed(4)},${direction.z.toFixed(4)})`
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
    this.rollCompletionDispatched = true
    this.phase = "result"
    this.placementUI.showRollComplete()

    const targetPosition = this.targetAnchor.getTransform().getWorldPosition()
    const outcome = classifyPuttEndpoint(
      this.rollEndPosition,
      targetPosition,
      this.rollStartPosition
    )
    this.outcomeFeedback.showOutcome(outcome.classification)
    const targetStable = targetPosition.distance(this.targetPositionAtRollStart) < 0.001
    console.log(
      `[GolfPutt] action=COMPLETE_ROLL phase=result outcome=${outcome.classification} endpointErrorCm=${outcome.distanceFromTargetCm.toFixed(2)} targetZoneDiameterCm=${PRACTICE_TARGET_ZONE_DIAMETER_CM.toFixed(2)} elapsed=${this.rollElapsedSeconds.toFixed(3)} position=${this.formatPosition(this.rollEndPosition)} targetStable=${targetStable}`
    )
  }

  private formatPosition(position: vec3): string {
    return `(${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)})`
  }
}
