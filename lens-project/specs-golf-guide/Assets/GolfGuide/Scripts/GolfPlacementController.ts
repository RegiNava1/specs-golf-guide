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

  private phase: PlacementPhase = "initial-placement"

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      this.dragInteraction.setInteractionEnabled(false)
      this.placementHandle.enabled = true

      this.placementUI.onMoveSetup.add(() => this.activateMoveSetup())
      this.placementUI.onConfirmPlacement.add(() => this.confirmPlacement())
      this.dragInteraction.onDragUpdate.add((position) => this.handlePlacementUpdate(position))

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
    this.dragInteraction.setInteractionEnabled(false)
    this.placementHandle.enabled = false
    this.placementUI.showConfirmed()

    const position = this.puttingSetupRoot.getTransform().getLocalPosition()
    print(
      `[GolfPlacement] action=CONFIRM_PLACEMENT phase=aiming setup=(${position.x.toFixed(
        2
      )},${position.y.toFixed(2)},${position.z.toFixed(2)})`
    )
  }
}
