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
const QUICK_MENU_WIDTH_CM = 15.5
const QUICK_MENU_HEIGHT_CM = 6.2
const QUICK_BUTTON_WIDTH_CM = 6
const QUICK_BUTTON_HEIGHT_CM = 3.4
const QUICK_MENU_FORWARD_CM = 70
const QUICK_MENU_RIGHT_CM = 13
const QUICK_MENU_UP_CM = -13
const QUICK_MENU_ENTER_DOT = 0.819 // About 35 degrees from the view center.
const QUICK_MENU_EXIT_DOT = 0.906 // About 25 degrees from the view center.
const QUICK_MENU_ENTER_DELAY_SECONDS = 0.25
const QUICK_MENU_EXIT_DELAY_SECONDS = 0.35
const QUICK_MENU_ACTION_COOLDOWN_SECONDS = 0.3

type MenuPhase = "placement" | "aiming" | "rolling" | "result"

type QuickAction = {
  label: string
  invoke: () => void
}

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
  private quickMenuRoot: SceneObject | null = null
  private quickMenuContent: SceneObject | null = null
  private quickButtons: Button[] = []
  private quickButtonContents: ElementContent[] = []
  private quickActions: QuickAction[] = []
  private cameraTransform: Transform | null = null
  private menuPhase: MenuPhase = "placement"
  private quickMenuReady = false
  private quickMenuActive = false
  private quickMenuTransition = 0
  private viewThresholdElapsed = 0
  private quickActionCooldown = 0

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

    this.createAdaptiveQuickMenu()
    this.createEvent("UpdateEvent").bind(() => this.updateAdaptiveQuickMenu())
  }

  public showMoveMode(): void {
    this.menuPhase = "placement"
    this.statusContent.text = "Drag the cyan handle, then confirm placement"
    this.refreshQuickActions()
  }

  public showConfirmed(): void {
    this.menuPhase = "aiming"
    this.statusContent.text = "Placement confirmed - select Adjust Aim"
    this.placementControlsObject.enabled = false
    this.adjustButton.opacity = 1
    this.aimControlsObject.enabled = true
    this.refreshQuickActions()
  }

  public showAimMode(): void {
    this.menuPhase = "aiming"
    this.statusContent.text = "Drag the cyan aim handle left or right"
    this.refreshQuickActions()
  }

  public showRolling(): void {
    this.menuPhase = "rolling"
    this.statusContent.text = "Ball rolling..."
    this.aimControlsObject.enabled = false
    this.resultControlsObject.enabled = false
    this.refreshQuickActions()
    this.setQuickMenuActive(false, true)
  }

  public showRollComplete(): void {
    this.menuPhase = "result"
    this.statusContent.text = "Practice putt complete"
    this.aimControlsObject.enabled = false
    this.resultRevealButton.opacity = 1
    this.resultControlsObject.enabled = true
    this.refreshQuickActions()
  }

  public showRetryReady(): void {
    this.menuPhase = "aiming"
    this.statusContent.text = "Aim preserved - adjust or putt again"
    this.placementControlsObject.enabled = false
    this.resultControlsObject.enabled = false
    this.adjustButton.opacity = 1
    this.aimControlsObject.enabled = true
    this.refreshQuickActions()
  }

  public showInitialPlacement(): void {
    this.menuPhase = "placement"
    this.statusContent.text = "Select Move Setup, then drag the cyan handle"
    this.resultControlsObject.enabled = false
    this.aimControlsObject.enabled = false
    this.placementControlsObject.enabled = true
    this.refreshQuickActions()
  }

  private createAdaptiveQuickMenu(): void {
    const cameraObject = this.findCameraObject()
    if (!cameraObject) {
      print("[GolfAdaptiveMenu] unavailable: no enabled scene camera")
      return
    }
    this.cameraTransform = cameraObject.getTransform()

    const root = global.scene.createSceneObject("AdaptiveQuickMenu_Root")
    root.setParent(cameraObject)
    root
      .getTransform()
      .setLocalPosition(
        new vec3(
          QUICK_MENU_RIGHT_CM,
          QUICK_MENU_UP_CM,
          -QUICK_MENU_FORWARD_CM
        )
      )
    root.getTransform().setLocalRotation(quat.quatIdentity())

    root.createComponent("Component.Canvas")

    this.quickMenuRoot = root
    this.buildQuickMenuContent(root)
    this.quickMenuReady = true
    this.refreshQuickActions()
    this.applyQuickMenuTransition(0)
    root.enabled = false
    print(
      "[GolfAdaptiveMenu] ready enterAngleDeg=35 exitAngleDeg=25 position=bottom-right footprint=41pct"
    )
  }

  private buildQuickMenuContent(host: SceneObject): void {
    const content = global.scene.createSceneObject("AdaptiveQuickDiamond_Content")
    content.setParent(host)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.15))
    this.quickMenuContent = content

    const layout = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    layout.width = QUICK_MENU_WIDTH_CM
    layout.height = QUICK_MENU_HEIGHT_CM
    layout.direction = FlexDirection.Row
    layout.justifyContent = FlexJustify.Center
    layout.alignItems = FlexAlign.Center
    layout.columnGap = 0.45

    this.createQuickButton(content, "QuickAction_LeftBase", 0)
    const diamond = global.scene.createSceneObject("QuickAction_DiamondCenter")
    diamond.setParent(content)
    const diamondContent = diamond.createComponent(
      ElementContent.getTypeName()
    ) as ElementContent
    diamondContent.text = "◆"
    diamondContent.textSize = 18
    diamondContent.contentAlignment = "center"
    diamondContent.sizeOverride = new vec2(1.6, 1.6)
    diamond.createComponent(FlexItem.getTypeName())
    this.createQuickButton(content, "QuickAction_RightBase", 1)
  }

  private createQuickButton(
    parent: SceneObject,
    name: string,
    index: number
  ): FlexItem {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)

    const button = object.createComponent(Button.getTypeName()) as Button
    button.setVariant({
      theme: "SnapOS3",
      shape: "Rectangle",
      style: index === 0 ? "Primary" : "Secondary",
    })
    button.onInitialized.add(() => {
      button.size = new vec3(
        QUICK_BUTTON_WIDTH_CM,
        QUICK_BUTTON_HEIGHT_CM,
        1
      )
    })
    button.onTriggerUp.add(() => this.triggerQuickAction(index))

    const content = object.createComponent(
      ElementContent.getTypeName()
    ) as ElementContent
    content.text = ""
    content.textSize = 12
    content.autoResize = true

    this.quickButtons.push(button)
    this.quickButtonContents.push(content)
    return object.createComponent(FlexItem.getTypeName()) as FlexItem
  }

  private refreshQuickActions(): void {
    if (this.menuPhase === "rolling") {
      this.quickActions = []
    } else if (this.menuPhase === "placement") {
      this.quickActions = [
        {label: "Move", invoke: () => this.onMoveSetup.invoke()},
        {label: "Lock", invoke: () => this.onConfirmPlacement.invoke()},
      ]
    } else if (this.menuPhase === "aiming") {
      this.quickActions = [
        {label: "Aim", invoke: () => this.onAdjustAim.invoke()},
        {label: "Putt", invoke: () => this.onPracticePutt.invoke()},
      ]
    } else {
      this.quickActions = [
        {label: "Retry", invoke: () => this.onTryAgain.invoke()},
        {label: "Reset", invoke: () => this.onResetSetup.invoke()},
      ]
    }

    if (!this.quickMenuReady) {
      return
    }

    for (let index = 0; index < this.quickButtonContents.length; index += 1) {
      const action = this.quickActions[index]
      this.quickButtonContents[index].text = action?.label ?? ""
      this.quickButtons[index].getSceneObject().enabled = action !== undefined
    }
  }

  private triggerQuickAction(index: number): void {
    if (
      !this.quickMenuActive ||
      this.menuPhase === "rolling" ||
      this.quickActionCooldown > 0
    ) {
      return
    }

    const action = this.quickActions[index]
    if (!action) {
      return
    }

    this.quickActionCooldown = QUICK_MENU_ACTION_COOLDOWN_SECONDS
    print(
      `[GolfAdaptiveMenu] action=${action.label.replace(" ", "_").toUpperCase()}`
    )
    action.invoke()
  }

  private updateAdaptiveQuickMenu(): void {
    if (!this.quickMenuReady || !this.cameraTransform || !this.quickMenuRoot) {
      return
    }

    const deltaTime = Math.min(0.1, Math.max(0, getDeltaTime()))
    this.quickActionCooldown = Math.max(0, this.quickActionCooldown - deltaTime)

    if (this.menuPhase === "rolling") {
      this.setQuickMenuActive(false, true)
      return
    }

    const viewDot = this.getPanelViewDot()
    const beyondThreshold = this.quickMenuActive
      ? viewDot > QUICK_MENU_EXIT_DOT
      : viewDot < QUICK_MENU_ENTER_DOT

    if (beyondThreshold) {
      this.viewThresholdElapsed += deltaTime
      const delay = this.quickMenuActive
        ? QUICK_MENU_EXIT_DELAY_SECONDS
        : QUICK_MENU_ENTER_DELAY_SECONDS
      if (this.viewThresholdElapsed >= delay) {
        this.setQuickMenuActive(!this.quickMenuActive, false, viewDot)
      }
    } else {
      this.viewThresholdElapsed = 0
    }

    const target = this.quickMenuActive ? 1 : 0
    const blend = Math.min(1, deltaTime * 8)
    this.quickMenuTransition += (target - this.quickMenuTransition) * blend
    this.applyQuickMenuTransition(this.quickMenuTransition)

    if (!this.quickMenuActive && this.quickMenuTransition < 0.02) {
      this.quickMenuTransition = 0
      this.applyQuickMenuTransition(0)
      this.quickMenuRoot.enabled = false
    }
  }

  private getPanelViewDot(): number {
    if (!this.cameraTransform) {
      return 1
    }

    const cameraPosition = this.cameraTransform.getWorldPosition()
    const toPanel = this.sceneObject
      .getTransform()
      .getWorldPosition()
      .sub(cameraPosition)
    if (toPanel.length <= 0.001) {
      return 1
    }

    const viewForward = this.cameraTransform
      .getWorldRotation()
      .multiplyVec3(vec3.back())
      .normalize()
    return viewForward.dot(toPanel.normalize())
  }

  private setQuickMenuActive(
    active: boolean,
    immediate: boolean,
    viewDot?: number
  ): void {
    if (!this.quickMenuRoot) {
      return
    }

    const changed = this.quickMenuActive !== active
    this.quickMenuActive = active
    this.viewThresholdElapsed = 0

    if (active) {
      this.quickMenuRoot.enabled = true
    }

    if (immediate) {
      this.quickMenuTransition = active ? 1 : 0
      this.applyQuickMenuTransition(this.quickMenuTransition)
      if (!active) {
        this.quickMenuRoot.enabled = false
      }
    }

    if (changed) {
      const mode = active ? "compact" : "full"
      const dotText = viewDot === undefined ? "n/a" : viewDot.toFixed(3)
      print(
        `[GolfAdaptiveMenu] mode=${mode} phase=${this.menuPhase} viewDot=${dotText}`
      )
    }
  }

  private applyQuickMenuTransition(progress: number): void {
    if (!this.quickMenuContent) {
      return
    }

    const scale = 0.92 + 0.08 * progress
    this.quickMenuContent.getTransform().setLocalScale(new vec3(scale, scale, 1))
    for (const button of this.quickButtons) {
      button.opacity = progress
    }
  }

  private findCameraObject(): SceneObject | null {
    const visit = (object: SceneObject): SceneObject | null => {
      const camera = object.getComponent("Component.Camera")
      if (camera && object.isEnabledInHierarchy) {
        return object
      }

      for (let index = 0; index < object.getChildrenCount(); index += 1) {
        const result = visit(object.getChild(index))
        if (result) {
          return result
        }
      }
      return null
    }

    for (let index = 0; index < global.scene.getRootObjectsCount(); index += 1) {
      const result = visit(global.scene.getRootObject(index))
      if (result) {
        return result
      }
    }
    return null
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
