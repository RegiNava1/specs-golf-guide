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
import type {PuttClassification} from "./GolfOutcome"
import {
  DEFAULT_PRACTICE_RANGE_DISTANCE_CM,
  isPracticeRangeDistanceCm,
  PRACTICE_RANGE_DISTANCES_CM,
  type PracticeRangeDistanceCm,
} from "./PracticeRange"

const PANEL_WIDTH_CM = 40
const PANEL_HEIGHT_CM = 13
const BUTTON_WIDTH_CM = 17.8
const BUTTON_HEIGHT_CM = 5.6
const FULL_BUTTON_LABEL_SIZE = 72
const FULL_BUTTON_LABEL_WEIGHT = 700
const STATUS_TEXT_SIZE = 72
const STATUS_TEXT_WEIGHT = 700
const STATUS_PANEL_WIDTH_CM = 38
const STATUS_PANEL_HEIGHT_CM = 6.8
const STATUS_PANEL_Y_CM = -10.5
const ACTION_ROW_Y_CM = -1.8
const NAV_ROW_Y_CM = 3.6
const NAV_BUTTON_WIDTH_CM = 8.5
const NAV_BUTTON_HEIGHT_CM = 3
const NAV_BUTTON_LABEL_SIZE = 38
const RANGE_BUTTON_WIDTH_CM = 5.6
const RANGE_BUTTON_HEIGHT_CM = 5.2
const RANGE_BUTTON_LABEL_SIZE = 36
const STROKE_GUIDANCE_TEXT =
  "Drag the cyan ring back,\nthen stroke forward through the ball."
const STROKE_LABEL_TEXT = "Stroke Practice"
const STROKE_LABEL_SIZE = 72
const STROKE_LABEL_WEIGHT = 700
const STROKE_LABEL_RIGHT_CM = 11.5
const STROKE_LABEL_FLOOR_OFFSET_CM = -5.45
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
const TEMP_PREVIEW_FORWARD_CM = 70
const TEMP_PREVIEW_UP_CM = -7
const TEMP_PREVIEW_WIDTH_CM = 24
const TEMP_PREVIEW_HEIGHT_CM = 5.5
const TEMP_PREVIEW_SHOW_DOT = 0.72

type MenuPhase = "placement" | "aiming" | "rolling" | "result"
type MenuView = "contextual" | "home" | "range"

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
  public readonly onPracticeDistanceSelected = new Event<number>()

  private placementControlsObject!: SceneObject
  private aimControlsObject!: SceneObject
  private resultControlsObject!: SceneObject
  private homeControlsObject!: SceneObject
  private rangeControlsObject!: SceneObject
  private navigationControlsObject!: SceneObject
  private moveButtonObject!: SceneObject
  private confirmButtonObject!: SceneObject
  private adjustButton!: Button
  private resultRevealButton!: Button
  private statusText!: Text
  private quickMenuRoot: SceneObject | null = null
  private quickMenuContent: SceneObject | null = null
  private quickButtons: Button[] = []
  private quickButtonLabels: Text[] = []
  private quickActions: QuickAction[] = []
  private cameraTransform: Transform | null = null
  private setupTransform: Transform | null = null
  private temporaryPreviewRoot: SceneObject | null = null
  private menuPhase: MenuPhase = "placement"
  private menuView: MenuView = "contextual"
  private quickMenuReady = false
  private quickMenuActive = false
  private quickMenuTransition = 0
  private viewThresholdElapsed = 0
  private quickActionCooldown = 0
  private selectedPracticeDistanceCm: PracticeRangeDistanceCm =
    DEFAULT_PRACTICE_RANGE_DISTANCE_CM
  private rangeButtons: Array<{distance: PracticeRangeDistanceCm; button: Button}> = []
  private resultStatus: PuttClassification | null = null

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const backPlate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    backPlate.size = new vec2(PANEL_WIDTH_CM, PANEL_HEIGHT_CM)

    this.placementControlsObject = global.scene.createSceneObject("PlacementControls_Content")
    this.placementControlsObject.setParent(this.sceneObject)
    this.placementControlsObject
      .getTransform()
      .setLocalPosition(new vec3(0, ACTION_ROW_Y_CM, 0.6))

    const layout = this.placementControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    layout.width = PANEL_WIDTH_CM - 3
    layout.height = BUTTON_HEIGHT_CM
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
    this.aimControlsObject
      .getTransform()
      .setLocalPosition(new vec3(0, ACTION_ROW_Y_CM, 0.7))

    const aimLayout = this.aimControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    aimLayout.width = PANEL_WIDTH_CM - 3
    aimLayout.height = BUTTON_HEIGHT_CM
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
      "Quick Putt",
      "Secondary",
      () => this.onPracticePutt.invoke()
    )
    this.adjustButton.opacity = 0
    this.adjustButton.onInitialized.add(() => {
      this.aimControlsObject.enabled = false
    })

    this.resultControlsObject = global.scene.createSceneObject("ResultControls_Content")
    this.resultControlsObject.setParent(this.sceneObject)
    this.resultControlsObject
      .getTransform()
      .setLocalPosition(new vec3(0, ACTION_ROW_Y_CM, 0.8))

    const resultLayout = this.resultControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    resultLayout.width = PANEL_WIDTH_CM - 3
    resultLayout.height = BUTTON_HEIGHT_CM
    resultLayout.direction = FlexDirection.Row
    resultLayout.justifyContent = FlexJustify.Center
    resultLayout.alignItems = FlexAlign.Center
    resultLayout.columnGap = 1.2

    const tryAgainButtonObject = this.createButton(
      this.resultControlsObject,
      "TryAgain_Control",
      "Retry Shot",
      "Primary",
      () => this.onTryAgain.invoke()
    )
    this.resultRevealButton = tryAgainButtonObject.getComponent(
      Button.getTypeName()
    ) as Button
    this.createButton(
      this.resultControlsObject,
      "ResetSetup_Control",
      "Reset All",
      "Secondary",
      () => this.onResetSetup.invoke()
    )
    this.resultRevealButton.opacity = 0
    this.resultRevealButton.onInitialized.add(() => {
      this.resultControlsObject.enabled = false
    })

    this.homeControlsObject = global.scene.createSceneObject("HomeControls_Content")
    this.homeControlsObject.setParent(this.sceneObject)
    this.homeControlsObject
      .getTransform()
      .setLocalPosition(new vec3(0, ACTION_ROW_Y_CM, 0.9))
    const homeLayout = this.homeControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    homeLayout.width = PANEL_WIDTH_CM - 3
    homeLayout.height = BUTTON_HEIGHT_CM
    homeLayout.direction = FlexDirection.Row
    homeLayout.justifyContent = FlexJustify.Center
    homeLayout.alignItems = FlexAlign.Center
    homeLayout.columnGap = 1.2
    this.createButton(
      this.homeControlsObject,
      "PracticeRange_Control",
      "Practice Range",
      "Primary",
      () => this.openRange()
    )
    this.createButton(
      this.homeControlsObject,
      "HomeResetAll_Control",
      "Reset All",
      "Secondary",
      () => this.onResetSetup.invoke()
    )
    this.homeControlsObject.enabled = false

    this.rangeControlsObject = global.scene.createSceneObject(
      "PracticeRangeControls_Content"
    )
    this.rangeControlsObject.setParent(this.sceneObject)
    this.rangeControlsObject
      .getTransform()
      .setLocalPosition(new vec3(0, ACTION_ROW_Y_CM, 0.95))
    const rangeLayout = this.rangeControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    rangeLayout.width = PANEL_WIDTH_CM - 3
    rangeLayout.height = RANGE_BUTTON_HEIGHT_CM
    rangeLayout.direction = FlexDirection.Row
    rangeLayout.justifyContent = FlexJustify.Center
    rangeLayout.alignItems = FlexAlign.Center
    rangeLayout.columnGap = 0.35
    for (const distance of PRACTICE_RANGE_DISTANCES_CM) {
      this.createRangeButton(this.rangeControlsObject, distance)
    }
    this.rangeControlsObject.enabled = false
    this.refreshRangeButtons()

    this.navigationControlsObject = global.scene.createSceneObject(
      "MenuNavigation_Content"
    )
    this.navigationControlsObject.setParent(this.sceneObject)
    this.navigationControlsObject
      .getTransform()
      .setLocalPosition(new vec3(0, NAV_ROW_Y_CM, 1))
    const navigationLayout = this.navigationControlsObject.createComponent(
      FlexLayout.getTypeName()
    ) as FlexLayout
    navigationLayout.width = PANEL_WIDTH_CM - 3
    navigationLayout.height = NAV_BUTTON_HEIGHT_CM
    navigationLayout.direction = FlexDirection.Row
    navigationLayout.justifyContent = FlexJustify.SpaceBetween
    navigationLayout.alignItems = FlexAlign.Center
    this.createNavigationButton(
      this.navigationControlsObject,
      "BackNavigation_Control",
      "Back",
      () => this.closeMenu()
    )
    this.createNavigationButton(
      this.navigationControlsObject,
      "HomeNavigation_Control",
      "Home",
      () => this.openHome()
    )

    const statusPanelObject = global.scene.createSceneObject("PlacementStatus_Panel")
    statusPanelObject.setParent(this.sceneObject)
    statusPanelObject.getTransform().setLocalPosition(new vec3(0, STATUS_PANEL_Y_CM, 0.1))
    const statusBackPlate = statusPanelObject.createComponent(
      BackPlate.getTypeName()
    ) as BackPlate
    statusBackPlate.size = new vec2(STATUS_PANEL_WIDTH_CM, STATUS_PANEL_HEIGHT_CM)
    statusBackPlate.style = "dark"

    const statusObject = global.scene.createSceneObject("PlacementStatus")
    statusObject.setParent(statusPanelObject)
    statusObject.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    this.statusText = statusObject.createComponent("Component.Text") as Text
    this.statusText.text = "Select Move Setup,\nthen drag the cyan handle"
    this.statusText.size = STATUS_TEXT_SIZE
    ;(this.statusText as Text & {weight?: number}).weight = STATUS_TEXT_WEIGHT
    this.statusText.depthTest = true
    this.statusText.textFill.color = new vec4(1, 1, 1, 1)
    this.statusText.horizontalAlignment = HorizontalAlignment.Center
    this.statusText.verticalAlignment = VerticalAlignment.Center
    this.statusText.horizontalOverflow = HorizontalOverflow.Overflow
    this.statusText.verticalOverflow = VerticalOverflow.Overflow
    this.statusText.layoutRect = Rect.create(-18, 18, -2.9, 2.9)

    this.createStrokePracticeLabel()
    this.createAdaptiveQuickMenu()
    this.createTemporarySetupPreview()
    this.createEvent("UpdateEvent").bind(() => this.updateAdaptiveQuickMenu())
  }

  public showMoveMode(): void {
    this.menuPhase = "placement"
    this.menuView = "contextual"
    this.statusText.text = "Drag the cyan handle,\nthen confirm placement"
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showConfirmed(): void {
    this.menuPhase = "aiming"
    this.menuView = "contextual"
    this.statusText.text = STROKE_GUIDANCE_TEXT
    this.adjustButton.opacity = 1
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showAimMode(): void {
    this.menuPhase = "aiming"
    this.menuView = "contextual"
    this.statusText.text = STROKE_GUIDANCE_TEXT
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showRolling(): void {
    this.menuPhase = "rolling"
    this.menuView = "contextual"
    this.statusText.text = "Ball rolling..."
    this.applyMenuView()
    this.refreshQuickActions()
    this.setQuickMenuActive(false, true)
  }

  public showRollComplete(outcome: PuttClassification): void {
    this.menuPhase = "result"
    this.menuView = "contextual"
    this.statusText.text = outcome
    this.resultStatus = outcome
    this.resultRevealButton.opacity = 1
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showRetryReady(): void {
    this.menuPhase = "aiming"
    this.menuView = "contextual"
    this.statusText.text = STROKE_GUIDANCE_TEXT
    this.resultStatus = null
    this.adjustButton.opacity = 1
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showInitialPlacement(): void {
    this.menuPhase = "placement"
    this.menuView = "contextual"
    this.statusText.text = "Select Move Setup,\nthen drag the cyan handle"
    this.resultStatus = null
    this.applyMenuView()
    this.refreshQuickActions()
  }

  private openHome(): void {
    if (this.menuPhase === "rolling" || this.menuView === "home") {
      return
    }
    this.menuView = "home"
    this.statusText.text = "Practice Home\nResume or reset the station"
    this.applyMenuView()
  }

  private openRange(): void {
    if (
      this.menuPhase === "rolling" ||
      this.menuPhase === "result" ||
      this.menuView === "range"
    ) {
      return
    }
    this.menuView = "range"
    this.statusText.text = `Practice Range\nSelected: ${this.selectedPracticeDistanceCm} cm`
    this.applyMenuView()
  }

  private closeMenu(): void {
    if (this.menuPhase === "rolling" || this.menuView === "contextual") {
      return
    }
    if (this.menuView === "range") {
      this.openHome()
      return
    }
    this.menuView = "contextual"
    this.restorePhaseStatus()
    this.applyMenuView()
  }

  public setPracticeDistance(distanceCm: number): void {
    if (!isPracticeRangeDistanceCm(distanceCm)) {
      return
    }
    this.selectedPracticeDistanceCm = distanceCm
    this.refreshRangeButtons()
    if (this.menuView === "range") {
      this.statusText.text = `Practice Range\nSelected: ${distanceCm} cm`
    }
  }

  private applyMenuView(): void {
    const contextual = this.menuView === "contextual"
    this.placementControlsObject.enabled =
      contextual && this.menuPhase === "placement"
    this.aimControlsObject.enabled = contextual && this.menuPhase === "aiming"
    this.resultControlsObject.enabled =
      contextual && this.menuPhase === "result"
    this.homeControlsObject.enabled =
      this.menuView === "home" && this.menuPhase !== "rolling"
    this.rangeControlsObject.enabled =
      this.menuView === "range" &&
      this.menuPhase !== "rolling" &&
      this.menuPhase !== "result"
    this.navigationControlsObject.enabled = this.menuPhase !== "rolling"
  }

  private restorePhaseStatus(): void {
    if (this.menuPhase === "placement") {
      this.statusText.text = "Select Move Setup,\nthen drag the cyan handle"
    } else if (this.menuPhase === "aiming") {
      this.statusText.text = STROKE_GUIDANCE_TEXT
    } else if (this.menuPhase === "result" && this.resultStatus) {
      this.statusText.text = this.resultStatus
    }
  }

  private createStrokePracticeLabel(): void {
    const strokeHandle = this.findSceneObjectByName("StrokeHandle_Anchor")
    if (!strokeHandle) {
      console.warn(
        "[GolfPlacementUI] Stroke Practice label unavailable: StrokeHandle_Anchor not found"
      )
      return
    }

    const labelRoot = global.scene.createSceneObject("StrokePractice_Label")
    labelRoot.setParent(strokeHandle)
    labelRoot
      .getTransform()
      .setLocalPosition(
        new vec3(
          STROKE_LABEL_RIGHT_CM,
          STROKE_LABEL_FLOOR_OFFSET_CM,
          0
        )
      )
    labelRoot
      .getTransform()
      .setLocalRotation(quat.fromEulerAngles(MathUtils.DegToRad * -90, 0, 0))

    const label = labelRoot.createComponent("Component.Text") as Text
    label.text = STROKE_LABEL_TEXT
    label.size = STROKE_LABEL_SIZE
    ;(label as Text & {weight?: number}).weight = STROKE_LABEL_WEIGHT
    label.depthTest = true
    label.textFill.color = new vec4(0.15, 0.95, 1, 1)
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Shrink
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(-9, 9, -1.6, 1.6)
  }

  private createTemporarySetupPreview(): void {
    if (!this.cameraTransform) {
      return
    }
    const setup = this.findSceneObjectByName("PuttingSetup_Root")
    if (!setup) {
      console.warn(
        "[GolfPlacementUI] Temporary setup preview unavailable: PuttingSetup_Root not found"
      )
      return
    }
    this.setupTransform = setup.getTransform()

    const root = global.scene.createSceneObject("TemporarySetupPreview_Root")
    root.setParent(this.cameraTransform.getSceneObject())
    root
      .getTransform()
      .setLocalPosition(
        new vec3(0, TEMP_PREVIEW_UP_CM, -TEMP_PREVIEW_FORWARD_CM)
      )
    root.createComponent("Component.Canvas")
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(TEMP_PREVIEW_WIDTH_CM, TEMP_PREVIEW_HEIGHT_CM)
    plate.style = "dark"

    const labelObject = global.scene.createSceneObject(
      "TemporarySetupPreview_Label"
    )
    labelObject.setParent(root)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const label = labelObject.createComponent("Component.Text") as Text
    label.text = "Temporary setup preview\n● ━━━━━━━ ◎"
    label.size = 34
    label.weight = 700
    label.depthTest = true
    label.textFill.color = new vec4(0.25, 0.95, 1, 1)
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Overflow
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(-11, 11, -2.2, 2.2)

    this.temporaryPreviewRoot = root
    root.enabled = false
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
    button.size = new vec3(
      QUICK_BUTTON_WIDTH_CM,
      QUICK_BUTTON_HEIGHT_CM,
      1
    )
    button.setVariant({
      theme: "SnapOS3",
      shape: "Rectangle",
      style: index === 0 ? "Primary" : "Secondary",
    })
    button.onTriggerUp.add(() => this.triggerQuickAction(index))

    const labelObject = global.scene.createSceneObject(`${name}_Label`)
    labelObject.setParent(object)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    const label = labelObject.createComponent("Component.Text") as Text
    label.text = ""
    label.size = 24
    label.weight = 500
    label.depthTest = true
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Overflow
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(
      -(QUICK_BUTTON_WIDTH_CM - 0.5) / 2,
      (QUICK_BUTTON_WIDTH_CM - 0.5) / 2,
      -1.2,
      1.2
    )

    this.quickButtons.push(button)
    this.quickButtonLabels.push(label)
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
        {label: "Reset All", invoke: () => this.onResetSetup.invoke()},
      ]
    }

    if (!this.quickMenuReady) {
      return
    }

    for (let index = 0; index < this.quickButtonLabels.length; index += 1) {
      const action = this.quickActions[index]
      this.quickButtonLabels[index].text = action?.label ?? ""
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
    this.updateTemporarySetupPreview()

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

  private updateTemporarySetupPreview(): void {
    if (
      !this.temporaryPreviewRoot ||
      !this.setupTransform ||
      !this.cameraTransform
    ) {
      return
    }
    const shouldShow =
      this.menuPhase === "placement" &&
      this.getTransformViewDot(this.setupTransform) < TEMP_PREVIEW_SHOW_DOT
    this.temporaryPreviewRoot.enabled = shouldShow
  }

  private getPanelViewDot(): number {
    return this.getTransformViewDot(this.sceneObject.getTransform())
  }

  private getTransformViewDot(targetTransform: Transform): number {
    if (!this.cameraTransform) {
      return 1
    }
    const cameraPosition = this.cameraTransform.getWorldPosition()
    const toPanel = targetTransform.getWorldPosition().sub(cameraPosition)
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

  private findSceneObjectByName(name: string): SceneObject | null {
    const visit = (object: SceneObject): SceneObject | null => {
      if (object.name === name) {
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

    const labelObject = global.scene.createSceneObject(`${name}_Label`)
    labelObject.setParent(object)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    const labelText = labelObject.createComponent("Component.Text") as Text
    labelText.text = label
    labelText.size = FULL_BUTTON_LABEL_SIZE
    ;(labelText as Text & {weight?: number}).weight = FULL_BUTTON_LABEL_WEIGHT
    labelText.depthTest = true
    labelText.textFill.color = new vec4(1, 1, 1, 1)
    labelText.horizontalAlignment = HorizontalAlignment.Center
    labelText.verticalAlignment = VerticalAlignment.Center
    labelText.horizontalOverflow = HorizontalOverflow.Overflow
    labelText.verticalOverflow = VerticalOverflow.Overflow
    labelText.layoutRect = Rect.create(
      -(BUTTON_WIDTH_CM - 1) / 2,
      (BUTTON_WIDTH_CM - 1) / 2,
      -2.25,
      2.25
    )
    object.createComponent(FlexItem.getTypeName())
    return object
  }

  private createNavigationButton(
    parent: SceneObject,
    name: string,
    label: string,
    onTrigger: () => void
  ): void {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    const button = object.createComponent(Button.getTypeName()) as Button
    button.setVariant({
      theme: "SnapOS3",
      shape: "Rectangle",
      style: "Secondary",
    })
    button.onInitialized.add(() => {
      button.size = new vec3(
        NAV_BUTTON_WIDTH_CM,
        NAV_BUTTON_HEIGHT_CM,
        1
      )
    })
    button.onTriggerUp.add(onTrigger)

    const labelObject = global.scene.createSceneObject(`${name}_Label`)
    labelObject.setParent(object)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    const labelText = labelObject.createComponent("Component.Text") as Text
    labelText.text = label
    labelText.size = NAV_BUTTON_LABEL_SIZE
    labelText.weight = 700
    labelText.depthTest = true
    labelText.textFill.color = new vec4(1, 1, 1, 1)
    labelText.horizontalAlignment = HorizontalAlignment.Center
    labelText.verticalAlignment = VerticalAlignment.Center
    labelText.horizontalOverflow = HorizontalOverflow.Overflow
    labelText.verticalOverflow = VerticalOverflow.Overflow
    labelText.layoutRect = Rect.create(
      -(NAV_BUTTON_WIDTH_CM - 0.6) / 2,
      (NAV_BUTTON_WIDTH_CM - 0.6) / 2,
      -1.2,
      1.2
    )
    object.createComponent(FlexItem.getTypeName())
  }

  private createRangeButton(
    parent: SceneObject,
    distance: PracticeRangeDistanceCm
  ): void {
    const object = global.scene.createSceneObject(`PracticeRange_${distance}cm_Control`)
    object.setParent(parent)
    const button = object.createComponent(Button.getTypeName()) as Button
    button.setVariant({
      theme: "SnapOS3",
      shape: "Rectangle",
      style: distance === this.selectedPracticeDistanceCm ? "Primary" : "Secondary",
    })
    button.onInitialized.add(() => {
      button.size = new vec3(
        RANGE_BUTTON_WIDTH_CM,
        RANGE_BUTTON_HEIGHT_CM,
        1
      )
    })
    button.onTriggerUp.add(() => this.onPracticeDistanceSelected.invoke(distance))

    const labelObject = global.scene.createSceneObject(
      `PracticeRange_${distance}cm_Label`
    )
    labelObject.setParent(object)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    const label = labelObject.createComponent("Component.Text") as Text
    label.text = `${distance}`
    label.size = RANGE_BUTTON_LABEL_SIZE
    label.weight = 700
    label.depthTest = true
    label.textFill.color = new vec4(1, 1, 1, 1)
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Shrink
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(-2.4, 2.4, -1.5, 1.5)
    object.createComponent(FlexItem.getTypeName())
    this.rangeButtons.push({distance, button})
  }

  private refreshRangeButtons(): void {
    for (const entry of this.rangeButtons) {
      entry.button.opacity =
        entry.distance === this.selectedPracticeDistanceCm ? 1 : 0.65
    }
  }
}
