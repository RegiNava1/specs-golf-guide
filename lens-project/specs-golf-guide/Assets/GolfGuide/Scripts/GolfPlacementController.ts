import {AimDragInteraction} from "./AimDragInteraction"
import {GolfPlacementUI} from "./GolfPlacementUI"
import {PlacementDragInteraction} from "./PlacementDragInteraction"

type PlacementPhase = "initial-placement" | "moving-setup" | "aiming"

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

  private phase: PlacementPhase = "initial-placement"
  private aimAdjustmentActive = false
  private aimDirection = new vec3(0, 0, -1)
  private targetPositionAtAimStart = vec3.zero()

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      this.dragInteraction.setInteractionEnabled(false)
      this.aimDragInteraction.setInteractionEnabled(false)
      this.placementHandle.enabled = true
      this.aimHandle.enabled = false

      this.placementUI.onMoveSetup.add(() => this.activateMoveSetup())
      this.placementUI.onConfirmPlacement.add(() => this.confirmPlacement())
      this.placementUI.onAdjustAim.add(() => this.activateAdjustAim())
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
}
