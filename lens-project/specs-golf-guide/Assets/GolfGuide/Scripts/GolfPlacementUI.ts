import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {
  FlexAlign,
  FlexDirection,
  FlexJustify,
} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

const PANEL_WIDTH_CM = 40
const PANEL_HEIGHT_CM = 8
const BUTTON_WIDTH_CM = 17
const BUTTON_HEIGHT_CM = 4.2

/** Runtime UIKit panel for the bounded placement workflow. */
@component
export class GolfPlacementUI extends BaseScriptComponent {
  public readonly onMoveSetup = new Event<void>()
  public readonly onConfirmPlacement = new Event<void>()
  public readonly onAdjustAim = new Event<void>()
  public readonly onPracticePutt = new Event<void>()
  public readonly onTryAgain = new Event<void>()
  public readonly onResetSetup = new Event<void>()

  private placementControlsObject!: SceneObject
  private aimControlsObject!: SceneObject
  private resultControlsObject!: SceneObject
  private moveButtonObject!: SceneObject
  private confirmButtonObject!: SceneObject
  private adjustButton!: Button
  private resultRevealButton!: Button
  private statusContent!: ElementContent

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const backPlate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    backPlate.size = new vec2(PANEL_WIDTH_CM, PANEL_HEIGHT_CM)

    this.placementControlsObject = global.scene.createSceneObject("PlacementControls_Content")
    this.placementControlsObject.setParent(this.sceneObject)
    this.placementControlsObject.getTransform().setLocalPosition(new vec3(0, 0, 0.6))

    const layout = this.placementControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    layout.width = PANEL_WIDTH_CM - 3
    layout.height = PANEL_HEIGHT_CM - 2
    layout.direction = FlexDirection.Row
    layout.justifyContent = FlexJustify.Center
    layout.alignItems = FlexAlign.Center
    layout.columnGap = 1.2

    this.moveButtonObject = this.createButton(
      this.placementControlsObject,
      "MoveSetup_Control",
      "Move Setup",
      "Primary",
      () => this.onMoveSetup.invoke()
    )
    this.confirmButtonObject = this.createButton(
      this.placementControlsObject,
      "ConfirmPlacement_Control",
      "Confirm Placement",
      "Secondary",
      () => this.onConfirmPlacement.invoke()
    )

    this.aimControlsObject = global.scene.createSceneObject("AimControls_Content")
    this.aimControlsObject.setParent(this.sceneObject)
    this.aimControlsObject.getTransform().setLocalPosition(new vec3(0, 0, 0.7))

    const aimLayout = this.aimControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    aimLayout.width = PANEL_WIDTH_CM - 3
    aimLayout.height = PANEL_HEIGHT_CM - 2
    aimLayout.direction = FlexDirection.Row
    aimLayout.justifyContent = FlexJustify.Center
    aimLayout.alignItems = FlexAlign.Center
    aimLayout.columnGap = 1.2

    const adjustButtonObject = this.createButton(
      this.aimControlsObject,
      "AdjustAim_Control",
      "Adjust Aim",
      "Primary",
      () => this.onAdjustAim.invoke()
    )
    this.adjustButton = adjustButtonObject.getComponent(Button.getTypeName()) as Button
    this.createButton(
      this.aimControlsObject,
      "PracticePutt_Control",
      "Practice Putt",
      "Secondary",
      () => this.onPracticePutt.invoke()
    )
    this.adjustButton.opacity = 0
    this.adjustButton.onInitialized.add(() => {
      this.aimControlsObject.enabled = false
    })

    this.resultControlsObject = global.scene.createSceneObject("ResultControls_Content")
    this.resultControlsObject.setParent(this.sceneObject)
    this.resultControlsObject.getTransform().setLocalPosition(new vec3(0, 0, 0.8))

    const resultLayout = this.resultControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    resultLayout.width = PANEL_WIDTH_CM - 3
    resultLayout.height = PANEL_HEIGHT_CM - 2
    resultLayout.direction = FlexDirection.Row
    resultLayout.justifyContent = FlexJustify.Center
    resultLayout.alignItems = FlexAlign.Center
    resultLayout.columnGap = 1.2

    const tryAgainButtonObject = this.createButton(
      this.resultControlsObject,
      "TryAgain_Control",
      "Try Again",
      "Primary",
      () => this.onTryAgain.invoke()
    )
    this.resultRevealButton = tryAgainButtonObject.getComponent(
      Button.getTypeName()
    ) as Button
    this.createButton(
      this.resultControlsObject,
      "ResetSetup_Control",
      "Reset Setup",
      "Secondary",
      () => this.onResetSetup.invoke()
    )
    this.resultRevealButton.opacity = 0
    this.resultRevealButton.onInitialized.add(() => {
      this.resultControlsObject.enabled = false
    })

    const statusObject = global.scene.createSceneObject("PlacementStatus")
    statusObject.setParent(this.sceneObject)
    statusObject.getTransform().setLocalPosition(new vec3(0, -5.5, 0.7))
    this.statusContent = statusObject.createComponent(ElementContent.getTypeName()) as ElementContent
    this.statusContent.text = "Select Move Setup, then drag the cyan handle"
    this.statusContent.textSize = 34
    this.statusContent.contentAlignment = "center"
    this.statusContent.sizeOverride = new vec2(34, 3)
  }

  public showMoveMode(): void {
    this.statusContent.text = "Drag the cyan handle, then confirm placement"
  }

  public showConfirmed(): void {
    this.statusContent.text = "Placement confirmed - select Adjust Aim"
    this.placementControlsObject.enabled = false
    this.adjustButton.opacity = 1
    this.aimControlsObject.enabled = true
  }

  public showAimMode(): void {
    this.statusContent.text = "Drag the cyan aim handle left or right"
  }

  public showRolling(): void {
    this.statusContent.text = "Ball rolling..."
    this.aimControlsObject.enabled = false
    this.resultControlsObject.enabled = false
  }

  public showRollComplete(): void {
    this.statusContent.text = "Practice putt complete"
    this.aimControlsObject.enabled = false
    this.resultRevealButton.opacity = 1
    this.resultControlsObject.enabled = true
  }

  public showRetryReady(): void {
    this.statusContent.text = "Aim preserved - adjust or putt again"
    this.placementControlsObject.enabled = false
    this.resultControlsObject.enabled = false
    this.adjustButton.opacity = 1
    this.aimControlsObject.enabled = true
  }

  public showInitialPlacement(): void {
    this.statusContent.text = "Select Move Setup, then drag the cyan handle"
    this.resultControlsObject.enabled = false
    this.aimControlsObject.enabled = false
    this.placementControlsObject.enabled = true
  }

  private createButton(
    parent: SceneObject,
    name: string,
    label: string,
    style: string,
    onTrigger: () => void
  ): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)

    const button = object.createComponent(Button.getTypeName()) as Button
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style})
    button.onInitialized.add(() => {
      button.size = new vec3(BUTTON_WIDTH_CM, BUTTON_HEIGHT_CM, 1)
    })
    button.onTriggerUp.add(onTrigger)

    const content = object.createComponent(ElementContent.getTypeName()) as ElementContent
    content.text = label
    content.textSize = 18
    content.autoResize = true
    object.createComponent(FlexItem.getTypeName())
    return object
  }
}
