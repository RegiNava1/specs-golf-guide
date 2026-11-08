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
import {formatDistanceToHoleFeet} from "./DistanceToHole"
import {
  getCompactMenuPresentation,
  getManualStrokeActionLabel,
  type CompactMenuActionId,
} from "./CompactMenuPolicy"
import {
  DEFAULT_PRACTICE_RANGE_DISTANCE_FT,
  getAdjacentPracticeRangeDistance,
  isPracticeRangeDistanceFt,
  PRACTICE_RANGE_DISTANCES_FT,
  type PracticeRangeDistanceFt,
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
const NAV_BUTTON_WIDTH_CM = 11.2
const NAV_BUTTON_HEIGHT_CM = 4.1
const NAV_BUTTON_LABEL_SIZE = 48
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
const QUICK_MENU_ACTION_UP_CM = -1.25
const QUICK_ACTION_BUTTON_X_CM = 3
const QUICK_BUTTON_WIDTH_CM = 4.5
const QUICK_BUTTON_HEIGHT_CM = 2.55
const QUICK_CENTER_BUTTON_WIDTH_CM = 4.5
const QUICK_CENTER_BUTTON_HEIGHT_CM = 2.55
const QUICK_MENU_FORWARD_CM = 70
const QUICK_MENU_RIGHT_CM = 8.5
const QUICK_MENU_UP_CM = -13
const QUICK_MENU_ACTION_COOLDOWN_SECONDS = 0.3
const QUICK_MENU_DOCK_SWITCH_DELAY_SECONDS = 0.35
const QUICK_MENU_DOCK_BLEND_RATE = 7
const QUICK_MENU_SAFE_EDGE_UV = 0.035
const QUICK_MENU_GEOMETRY_MARGIN_UV = 0.018
const QUICK_MENU_CURRENT_DOCK_MARGIN_UV = 0.012
const QUICK_RANGE_STRIP_UP_CM = 1.75
const QUICK_RANGE_STEP_X_CM = 4.3
const QUICK_RANGE_STEP_BUTTON_SIZE_CM = 2.16
const QUICK_RANGE_LABEL_SIZE = 38
const QUICK_ACTION_LABEL_SIZE = 32
const GHOST_COACH_RESERVED_WIDTH_CM = 54
const GHOST_COACH_RESERVED_HEIGHT_CM = 30
const COMPACT_PANEL_WIDTH_CM = 11.8
const COMPACT_PANEL_HEIGHT_CM = 6
const COMPACT_PANEL_UP_CM = 0.15
const COMPACT_RESULT_PANEL_HEIGHT_CM = 9
const COMPACT_RESULT_PANEL_UP_CM = -1.35
const COMPACT_RESULT_RESET_ROW_Y_CM = -3

type MenuPhase = "placement" | "aiming" | "rolling" | "result" | "holed"
type MenuView = "contextual" | "home" | "range"
type QuickMenuDock = "lower-right" | "lower-left" | "upper-right" | "upper-left"

type ScreenRect = {
  left: number
  right: number
  top: number
  bottom: number
}

type QuickAction = {
  label: string
  invoke: () => void
  enabled?: boolean
}

/** Runtime UIKit panel for the bounded placement workflow. */
@component
export class GolfPlacementUI extends BaseScriptComponent {
  public readonly onConfirmPlacement = new Event<void>()
  public readonly onAdjustAim = new Event<void>()
  public readonly onPrepareManualStroke = new Event<void>()
  public readonly onPracticePutt = new Event<void>()
  public readonly onNextPutt = new Event<void>()
  public readonly onReplayShot = new Event<void>()
  public readonly onResetSession = new Event<void>()
  public readonly onPracticeDistanceSelected = new Event<number>()
  public readonly onContextualViewChanged = new Event<boolean>()

  private placementControlsObject!: SceneObject
  private aimControlsObject!: SceneObject
  private resultControlsObject!: SceneObject
  private homeControlsObject!: SceneObject
  private rangeControlsObject!: SceneObject
  private navigationControlsObject!: SceneObject
  private rangeNavigationObject!: SceneObject
  private rangeNavigationLabel!: Text
  private confirmButtonObject!: SceneObject
  private adjustButton!: Button
  private resultRevealButton!: Button
  private statusText!: Text
  private fullBackPlate!: BackPlate
  private statusPanelObject!: SceneObject
  private quickMenuRoot: SceneObject | null = null
  private quickPanelBackPlateRoot: SceneObject | null = null
  private quickPanelBackPlate: BackPlate | null = null
  private quickMenuContent: SceneObject | null = null
  private quickButtons: Button[] = []
  private quickButtonLabels: Text[] = []
  private quickCenterButton: Button | null = null
  private quickCenterLabel: Text | null = null
  private quickCenterAction: QuickAction | null = null
  private quickRangeStripRoot: SceneObject | null = null
  private quickRangeStripLabel: Text | null = null
  private distanceToHoleFeet: number | null = null
  private completedPutts = 0
  private manualStrokePrepared = false
  private holedMessage: string | null = null
  private quickRangeMinusButton: Button | null = null
  private quickRangePlusButton: Button | null = null
  private quickRangeMinusLabel: Text | null = null
  private quickRangePlusLabel: Text | null = null
  private quickActions: QuickAction[] = []
  private cameraTransform: Transform | null = null
  private cameraComponent: Camera | null = null
  private ballTransform: Transform | null = null
  private targetTransform: Transform | null = null
  private practiceZoneTransform: Transform | null = null
  private holeTransform: Transform | null = null
  private aimHandleTransform: Transform | null = null
  private strokeHandleTransform: Transform | null = null
  private outcomeFeedbackTransform: Transform | null = null
  private placementCrosshairRoot: SceneObject | null = null
  private placementCrosshairText: Text | null = null
  private placementTooltipRoot: SceneObject | null = null
  private placementHandleHovered = false
  private placementHandleActive = false
  private menuPhase: MenuPhase = "placement"
  private menuView: MenuView = "contextual"
  private quickMenuReady = false
  private quickMenuActive = false
  private quickActionCooldown = 0
  private quickMenuDock: QuickMenuDock = "lower-right"
  private pendingQuickMenuDock: QuickMenuDock = "lower-right"
  private pendingQuickMenuDockElapsed = 0
  private quickMenuDockTarget = new vec3(
    QUICK_MENU_RIGHT_CM,
    QUICK_MENU_UP_CM,
    -QUICK_MENU_FORWARD_CM
  )
  private quickMenuDockDiagnosticsPrinted = false
  private fullMenuPresentationVisible = true
  private selectedPracticeDistanceFt: PracticeRangeDistanceFt =
    DEFAULT_PRACTICE_RANGE_DISTANCE_FT
  private rangeButtons: Array<{distance: PracticeRangeDistanceFt; button: Button}> = []
  private resultStatus: string | null = null

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.fullBackPlate = this.sceneObject.createComponent(
      BackPlate.getTypeName()
    ) as BackPlate
    this.fullBackPlate.size = new vec2(PANEL_WIDTH_CM, PANEL_HEIGHT_CM)

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

    const nextPuttButtonObject = this.createButton(
      this.resultControlsObject,
      "NextPutt_Control",
      "Next Putt",
      "Primary",
      () => this.onNextPutt.invoke()
    )
    this.resultRevealButton = nextPuttButtonObject.getComponent(
      Button.getTypeName()
    ) as Button
    this.createButton(
      this.resultControlsObject,
      "ReplayShot_Control",
      "Replay Shot",
      "Secondary",
      () => this.onReplayShot.invoke()
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
      "HomeResetSession_Control",
      "Reset Session",
      "Secondary",
      () => this.onResetSession.invoke()
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
    for (const distance of PRACTICE_RANGE_DISTANCES_FT) {
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
    navigationLayout.justifyContent = FlexJustify.Center
    navigationLayout.alignItems = FlexAlign.Center
    navigationLayout.columnGap = 0.7
    this.createNavigationButton(
      this.navigationControlsObject,
      "BackNavigation_Control",
      "Back",
      () => this.closeMenu()
    )
    const rangeNavigation = this.createNavigationButton(
      this.navigationControlsObject,
      "RangeNavigation_Control",
      `Range ${this.selectedPracticeDistanceFt} ft`,
      () => this.openRange()
    )
    this.rangeNavigationObject = rangeNavigation.object
    this.rangeNavigationLabel = rangeNavigation.label
    this.createNavigationButton(
      this.navigationControlsObject,
      "HomeNavigation_Control",
      "Home",
      () => this.openHome()
    )

    this.statusPanelObject = global.scene.createSceneObject(
      "PlacementStatus_Panel"
    )
    this.statusPanelObject.setParent(this.sceneObject)
    this.statusPanelObject
      .getTransform()
      .setLocalPosition(new vec3(0, STATUS_PANEL_Y_CM, 0.1))
    const statusBackPlate = this.statusPanelObject.createComponent(
      BackPlate.getTypeName()
    ) as BackPlate
    statusBackPlate.size = new vec2(STATUS_PANEL_WIDTH_CM, STATUS_PANEL_HEIGHT_CM)
    statusBackPlate.style = "dark"

    const statusObject = global.scene.createSceneObject("PlacementStatus")
    statusObject.setParent(this.statusPanelObject)
    statusObject.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    this.statusText = statusObject.createComponent("Component.Text") as Text
    this.statusText.text = "Drag + to position, then Lock"
    this.statusText.size = STATUS_TEXT_SIZE
    ;(this.statusText as Text & {weight?: number}).weight = STATUS_TEXT_WEIGHT
    this.statusText.depthTest = true
    this.statusText.textFill.color = new vec4(1, 1, 1, 1)
    this.statusText.horizontalAlignment = HorizontalAlignment.Center
    this.statusText.verticalAlignment = VerticalAlignment.Center
    this.statusText.horizontalOverflow = HorizontalOverflow.Overflow
    this.statusText.verticalOverflow = VerticalOverflow.Overflow
    this.statusText.layoutRect = Rect.create(-18, 18, -2.9, 2.9)

    this.createPlacementCrosshair()
    this.createStrokePracticeLabel()
    this.createAdaptiveQuickMenu()
    this.createEvent("UpdateEvent").bind(() => this.updateCompactMenu())
    this.setFullMenuPresentationVisible(false)
  }

  public showConfirmed(): void {
    this.menuPhase = "aiming"
    this.menuView = "contextual"
    this.holedMessage = null
    this.manualStrokePrepared = false
    this.statusText.text = STROKE_GUIDANCE_TEXT
    this.adjustButton.opacity = 1
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showAimMode(): void {
    this.menuPhase = "aiming"
    this.menuView = "contextual"
    this.statusText.text = STROKE_GUIDANCE_TEXT
    this.manualStrokePrepared = false
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showRolling(): void {
    this.menuPhase = "rolling"
    this.menuView = "contextual"
    this.statusText.text = "Ball rolling..."
    this.manualStrokePrepared = false
    this.applyMenuView()
    this.refreshQuickActions()
    this.setQuickMenuActive(false, true)
  }

  public showRollComplete(outcome: PuttClassification): void {
    this.menuPhase = "result"
    this.menuView = "contextual"
    this.statusText.text = outcome
    this.resultStatus = outcome
    this.holedMessage = null
    this.manualStrokePrepared = false
    this.resultRevealButton.opacity = 1
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showNextPuttReady(): void {
    this.menuPhase = "aiming"
    this.menuView = "contextual"
    this.statusText.text = STROKE_GUIDANCE_TEXT
    this.resultStatus = null
    this.holedMessage = null
    this.manualStrokePrepared = false
    this.adjustButton.opacity = 1
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showHoled(completedPutts: number): void {
    this.menuPhase = "holed"
    this.menuView = "contextual"
    this.completedPutts = completedPutts
    this.manualStrokePrepared = false
    this.holedMessage = `Holed in ${completedPutts} ${
      completedPutts === 1 ? "putt" : "putts"
    }`
    this.statusText.text = this.holedMessage
    this.resultStatus = this.holedMessage
    this.applyMenuView()
    this.refreshQuickActions()
  }

  public showInitialPlacement(): void {
    this.menuPhase = "placement"
    this.menuView = "contextual"
    this.statusText.text = "Drag + to position, then Lock"
    this.resultStatus = null
    this.holedMessage = null
    this.completedPutts = 0
    this.manualStrokePrepared = false
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
    this.onContextualViewChanged.invoke(false)
    this.refreshQuickActions()
  }

  private openRange(): void {
    if (
      this.menuPhase === "rolling" ||
      this.menuPhase !== "placement" ||
      this.menuView === "range"
    ) {
      return
    }
    this.menuView = "range"
    this.statusText.text = `Practice Range\nSelected: ${this.selectedPracticeDistanceFt} ft`
    this.applyMenuView()
    this.refreshQuickActions()
  }

  private closeMenu(): void {
    if (this.menuPhase === "rolling") {
      return
    }
    if (this.menuView === "range") {
      this.openHome()
      return
    }
    if (this.menuView === "contextual") {
      return
    }
    this.menuView = "contextual"
    this.restorePhaseStatus()
    this.applyMenuView()
    this.onContextualViewChanged.invoke(true)
    this.refreshQuickActions()
  }

  public setPracticeDistance(distanceFt: number): void {
    if (!isPracticeRangeDistanceFt(distanceFt)) {
      return
    }
    this.selectedPracticeDistanceFt = distanceFt
    this.rangeNavigationLabel.text = `Range ${distanceFt} ft`
    this.refreshRangeButtons()
    this.refreshQuickActions()
    if (this.menuView === "range") {
      this.statusText.text = `Practice Range\nSelected: ${distanceFt} ft`
    }
  }

  public setDistanceToHoleFeet(distanceFeet: number | null): void {
    this.distanceToHoleFeet =
      distanceFeet !== null && Number.isFinite(distanceFeet) && distanceFeet >= 0
        ? distanceFeet
        : null
    this.refreshQuickRangeStrip()
  }

  public setCompletedPutts(completedPutts: number): void {
    if (!Number.isFinite(completedPutts) || completedPutts < 0) {
      return
    }
    this.completedPutts = Math.floor(completedPutts)
    this.refreshQuickRangeStrip()
  }

  public showManualStrokeReady(): void {
    if (this.menuPhase !== "aiming") {
      return
    }
    this.manualStrokePrepared = true
    this.statusText.text = STROKE_GUIDANCE_TEXT
    this.refreshQuickActions()
  }

  public getCurrentMenuPhase(): string {
    return this.menuPhase
  }

  private applyMenuView(): void {
    const fullMenuVisible = this.fullMenuPresentationVisible
    const contextual = this.menuView === "contextual"
    this.placementControlsObject.enabled =
      fullMenuVisible && contextual && this.menuPhase === "placement"
    this.aimControlsObject.enabled =
      fullMenuVisible && contextual && this.menuPhase === "aiming"
    this.resultControlsObject.enabled =
      fullMenuVisible && contextual && this.menuPhase === "result"
    this.homeControlsObject.enabled =
      fullMenuVisible &&
      this.menuView === "home" &&
      this.menuPhase !== "rolling"
    this.rangeControlsObject.enabled =
      fullMenuVisible &&
      this.menuView === "range" &&
      this.menuPhase === "placement"
    this.navigationControlsObject.enabled =
      fullMenuVisible && this.menuPhase !== "rolling"
    this.rangeNavigationObject.enabled =
      fullMenuVisible && this.menuPhase === "placement"
    this.fullBackPlate.enabled = fullMenuVisible
    this.statusPanelObject.enabled = fullMenuVisible
  }

  private restorePhaseStatus(): void {
    if (this.menuPhase === "placement") {
      this.statusText.text = "Drag + to position, then Lock"
    } else if (this.menuPhase === "aiming") {
      this.statusText.text = STROKE_GUIDANCE_TEXT
    } else if (this.menuPhase === "result" && this.resultStatus) {
      this.statusText.text = this.resultStatus
    } else if (this.menuPhase === "holed" && this.holedMessage) {
      this.statusText.text = this.holedMessage
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

  private createAdaptiveQuickMenu(): void {
    const cameraObject = this.findCameraObject()
    if (!cameraObject) {
      print("[GolfCompactMenu] unavailable: no enabled scene camera")
      return
    }
    this.cameraTransform = cameraObject.getTransform()
    this.cameraComponent = cameraObject.getComponent("Component.Camera") as Camera
    this.captureQuickMenuGeometryTransforms()

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
    this.buildCompactPanelBackPlate(root)
    this.buildQuickMenuContent(root)
    this.buildQuickRangeStrip(root)
    this.quickMenuReady = true
    this.refreshQuickActions()
    root.enabled = false
    print(
      "[GolfCompactMenu] ready geometryAwareDocks=4 preferred=lower-right"
    )
  }

  private buildCompactPanelBackPlate(host: SceneObject): void {
    const root = global.scene.createSceneObject("CompactMenu_BackPlate")
    root.setParent(host)
    root
      .getTransform()
      .setLocalPosition(new vec3(0, COMPACT_PANEL_UP_CM, 0))
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(COMPACT_PANEL_WIDTH_CM, COMPACT_PANEL_HEIGHT_CM)
    plate.style = "dark"
    this.quickPanelBackPlateRoot = root
    this.quickPanelBackPlate = plate
  }

  private buildQuickMenuContent(host: SceneObject): void {
    const content = global.scene.createSceneObject("AdaptiveQuickDiamond_Content")
    content.setParent(host)
    content
      .getTransform()
      .setLocalPosition(new vec3(0, QUICK_MENU_ACTION_UP_CM, 0.15))
    this.quickMenuContent = content

    this.createQuickButton(content, "QuickAction_LeftBase", 0)
    this.createQuickCenterButton(content)
    this.createQuickButton(content, "QuickAction_RightBase", 1)
  }

  private buildQuickRangeStrip(host: SceneObject): void {
    const strip = global.scene.createSceneObject("CompactRangeStrip")
    strip.setParent(host)
    strip
      .getTransform()
      .setLocalPosition(new vec3(0, QUICK_RANGE_STRIP_UP_CM, 0.1))
    this.createQuickRangeStepButton(
      strip,
      "CompactRange_Minus",
      "−",
      -QUICK_RANGE_STEP_X_CM,
      -1
    )
    this.createQuickRangeStepButton(
      strip,
      "CompactRange_Plus",
      "+",
      QUICK_RANGE_STEP_X_CM,
      1
    )

    const labelObject = global.scene.createSceneObject("CompactRangeStrip_Label")
    labelObject.setParent(strip)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.5))
    const label = labelObject.createComponent("Component.Text") as Text
    label.text = this.getCompactDistanceText()
    label.size = QUICK_RANGE_LABEL_SIZE
    label.weight = 700
    label.depthTest = true
    label.textFill.color = new vec4(1, 1, 1, 1)
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Shrink
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(-2.9, 2.9, -1.15, 1.15)

    this.quickRangeStripRoot = strip
    this.quickRangeStripLabel = label
    strip.enabled = false
  }

  private createQuickRangeStepButton(
    parent: SceneObject,
    name: string,
    labelText: string,
    localX: number,
    direction: -1 | 1
  ): void {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    object.getTransform().setLocalPosition(new vec3(localX, 0, 0.55))
    const button = object.createComponent(Button.getTypeName()) as Button
    button.setVariant({
      theme: "SnapOS3",
      shape: "Rectangle",
      style: "Secondary",
    })
    button.onInitialized.add(() => {
      button.size = new vec3(
        QUICK_RANGE_STEP_BUTTON_SIZE_CM,
        QUICK_RANGE_STEP_BUTTON_SIZE_CM,
        1
      )
    })
    button.onTriggerUp.add(() => this.selectAdjacentRange(direction))

    const labelObject = global.scene.createSceneObject(`${name}_Label`)
    labelObject.setParent(object)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    const label = labelObject.createComponent("Component.Text") as Text
    label.text = labelText
    label.size = 34
    label.weight = 700
    label.depthTest = true
    label.textFill.color = new vec4(1, 1, 1, 1)
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Overflow
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(-1.1, 1.1, -1.1, 1.1)

    if (direction < 0) {
      this.quickRangeMinusButton = button
      this.quickRangeMinusLabel = label
    } else {
      this.quickRangePlusButton = button
      this.quickRangePlusLabel = label
    }
  }

  private createQuickButton(
    parent: SceneObject,
    name: string,
    index: number
  ): void {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    object
      .getTransform()
      .setLocalPosition(
        new vec3(
          index === 0
            ? -QUICK_ACTION_BUTTON_X_CM
            : QUICK_ACTION_BUTTON_X_CM,
          0,
          0
        )
      )

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
    label.size = QUICK_ACTION_LABEL_SIZE
    label.weight = 700
    label.depthTest = true
    label.textFill.color = new vec4(1, 1, 1, 1)
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Shrink
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(
      -(QUICK_BUTTON_WIDTH_CM - 0.5) / 2,
      (QUICK_BUTTON_WIDTH_CM - 0.5) / 2,
      -1.2,
      1.2
    )

    this.quickButtons.push(button)
    this.quickButtonLabels.push(label)
  }

  private refreshQuickActions(): void {
    const presentation = getCompactMenuPresentation(this.menuPhase)
    this.quickActions = presentation.sideActions.map((action) =>
      this.getQuickAction(action)
    )

    if (!this.quickMenuReady) {
      return
    }

    for (let index = 0; index < this.quickButtonLabels.length; index += 1) {
      const action = this.quickActions[index]
      this.quickButtonLabels[index].text = action?.label ?? ""
      this.quickButtons[index].getSceneObject().enabled =
        action !== undefined
      this.quickButtonLabels[index].textFill.color =
        action?.enabled === false
          ? new vec4(0.62, 0.66, 0.7, 1)
          : new vec4(1, 1, 1, 1)
    }
    if (this.quickCenterLabel && this.quickCenterButton) {
      this.quickCenterAction = presentation.centerAction
        ? this.getQuickAction(presentation.centerAction)
        : null
      this.quickCenterLabel.text = this.quickCenterAction?.label ?? ""
      this.quickCenterButton.getSceneObject().enabled =
        this.quickCenterAction !== null
    }
    this.refreshCompactActionRow()
    this.refreshCompactPanelBackPlate(this.quickMenuActive)
    this.refreshQuickRangeStrip()
  }

  private refreshCompactActionRow(): void {
    if (!this.quickMenuContent) {
      return
    }
    this.quickMenuContent
      .getTransform()
      .setLocalPosition(new vec3(0, QUICK_MENU_ACTION_UP_CM, 0.15))
    if (this.quickCenterButton) {
      this.quickCenterButton
        .getSceneObject()
        .getTransform()
        .setLocalPosition(
          new vec3(
            0,
            this.menuPhase === "result" || this.menuPhase === "aiming"
              ? COMPACT_RESULT_RESET_ROW_Y_CM
              : 0,
            0
          )
        )
    }
  }

  private refreshCompactPanelBackPlate(visible: boolean): void {
    if (!this.quickPanelBackPlateRoot || !this.quickPanelBackPlate) {
      return
    }
    this.quickPanelBackPlateRoot.enabled = visible
    this.quickPanelBackPlateRoot
      .getTransform()
      .setLocalPosition(new vec3(0, this.getCompactPanelUp(), 0))
    this.quickPanelBackPlate.size = new vec2(
      COMPACT_PANEL_WIDTH_CM,
      this.getCompactPanelHeight()
    )
  }

  private getCompactPanelHeight(): number {
    return this.menuPhase === "result" || this.menuPhase === "aiming"
      ? COMPACT_RESULT_PANEL_HEIGHT_CM
      : COMPACT_PANEL_HEIGHT_CM
  }

  private getCompactPanelUp(): number {
    return this.menuPhase === "result" || this.menuPhase === "aiming"
      ? COMPACT_RESULT_PANEL_UP_CM
      : COMPACT_PANEL_UP_CM
  }

  private getQuickAction(action: CompactMenuActionId): QuickAction {
    if (action === "adjust-aim") {
      return {label: "Adjust\nAim", invoke: () => this.onAdjustAim.invoke()}
    }
    if (action === "stroke-putt") {
      const label = this.manualStrokePrepared
        ? "Back →\nForward"
        : getManualStrokeActionLabel(this.completedPutts).replace(" ", "\n")
      return {label, invoke: () => this.onPrepareManualStroke.invoke()}
    }
    if (action === "quick-putt") {
      return {label: "Quick\nPutt", invoke: () => this.onPracticePutt.invoke()}
    }
    if (action === "next-putt") {
      return {label: "Next\nPutt", invoke: () => this.onNextPutt.invoke()}
    }
    if (action === "replay-shot") {
      return {label: "Replay\nShot", invoke: () => this.onReplayShot.invoke()}
    }
    if (action === "reset-session") {
      return {label: "Reset\nSession", invoke: () => this.onResetSession.invoke()}
    }
    if (action === "new-session") {
      return {label: "New\nSession", invoke: () => this.onResetSession.invoke()}
    }
    return {label: "Lock", invoke: () => this.onConfirmPlacement.invoke()}
  }

  private refreshQuickRangeStrip(): void {
    if (!this.quickRangeStripRoot || !this.quickRangeStripLabel) {
      return
    }
    this.quickRangeStripLabel.text = this.getCompactDistanceText()
    this.quickRangeStripLabel.size = QUICK_RANGE_LABEL_SIZE
    this.quickRangeStripLabel.layoutRect = Rect.create(
      -2.9,
      2.9,
      -1.15,
      1.15
    )
    this.quickRangeStripRoot.enabled = this.shouldShowQuickRangeStrip()

    const rangeEditable = this.isCompactRangeEditable()
    const previousRange = getAdjacentPracticeRangeDistance(
      this.selectedPracticeDistanceFt,
      -1
    )
    const nextRange = getAdjacentPracticeRangeDistance(
      this.selectedPracticeDistanceFt,
      1
    )
    this.setQuickRangeStepState(
      this.quickRangeMinusButton,
      this.quickRangeMinusLabel,
      rangeEditable && previousRange !== null
    )
    this.setQuickRangeStepState(
      this.quickRangePlusButton,
      this.quickRangePlusLabel,
      rangeEditable && nextRange !== null
    )
  }

  private setQuickRangeStepState(
    button: Button | null,
    label: Text | null,
    enabled: boolean
  ): void {
    if (!button || !label) {
      return
    }
    button.opacity = enabled ? 1 : 0.38
    label.textFill.color = enabled
      ? new vec4(1, 1, 1, 1)
      : new vec4(0.58, 0.62, 0.66, 1)
  }

  private getCompactDistanceText(): string {
    if (this.holedMessage) {
      return `${this.holedMessage}\nTo Hole: ${formatDistanceToHoleFeet(
        this.distanceToHoleFeet
      )}`
    }
    return `Range: ${this.selectedPracticeDistanceFt} ft  Putts: ${
      this.completedPutts
    }\nTo Hole: ${formatDistanceToHoleFeet(this.distanceToHoleFeet)}`
  }

  private isCompactRangeEditable(): boolean {
    return getCompactMenuPresentation(this.menuPhase).rangeEditable
  }

  private createQuickCenterButton(parent: SceneObject): void {
    const object = global.scene.createSceneObject("QuickAction_Center")
    object.setParent(parent)
    const button = object.createComponent(Button.getTypeName()) as Button
    button.setVariant({
      theme: "SnapOS3",
      shape: "Rectangle",
      style: "Secondary",
    })
    button.onInitialized.add(() => {
      button.size = new vec3(
        QUICK_CENTER_BUTTON_WIDTH_CM,
        QUICK_CENTER_BUTTON_HEIGHT_CM,
        1
      )
    })
    button.onTriggerUp.add(() => this.triggerQuickCenterAction())

    const labelObject = global.scene.createSceneObject("QuickAction_Center_Label")
    labelObject.setParent(object)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    const label = labelObject.createComponent("Component.Text") as Text
    label.text = "Lock"
    label.size = QUICK_ACTION_LABEL_SIZE
    label.weight = 700
    label.depthTest = true
    label.textFill.color = new vec4(1, 1, 1, 1)
    label.horizontalAlignment = HorizontalAlignment.Center
    label.verticalAlignment = VerticalAlignment.Center
    label.horizontalOverflow = HorizontalOverflow.Shrink
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(-2.7, 2.7, -1.15, 1.15)
    this.quickCenterButton = button
    this.quickCenterLabel = label
  }

  private triggerQuickCenterAction(): void {
    if (
      !this.quickMenuActive ||
      this.menuPhase === "rolling" ||
      this.quickActionCooldown > 0 ||
      !this.quickCenterAction
    ) {
      return
    }
    this.quickActionCooldown = QUICK_MENU_ACTION_COOLDOWN_SECONDS
    print(
      `[GolfCompactMenu] action=${this.quickCenterAction.label
        .replace("\n", "_")
        .toUpperCase()}`
    )
    this.quickCenterAction.invoke()
  }

  private selectAdjacentRange(direction: -1 | 1): void {
    if (!this.isCompactRangeEditable()) {
      return
    }
    const adjacent = getAdjacentPracticeRangeDistance(
      this.selectedPracticeDistanceFt,
      direction
    )
    if (adjacent === null) {
      return
    }
    this.onPracticeDistanceSelected.invoke(adjacent)
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
    if (!action || action.enabled === false) {
      return
    }

    this.quickActionCooldown = QUICK_MENU_ACTION_COOLDOWN_SECONDS
    print(
      `[GolfCompactMenu] action=${action.label.replace(" ", "_").toUpperCase()}`
    )
    action.invoke()
  }

  private updateCompactMenu(): void {
    if (!this.quickMenuReady || !this.cameraTransform || !this.quickMenuRoot) {
      return
    }

    const deltaTime = Math.min(0.1, Math.max(0, getDeltaTime()))
    this.quickActionCooldown = Math.max(0, this.quickActionCooldown - deltaTime)

    if (this.menuPhase === "rolling") {
      this.setQuickMenuActive(false, true)
      return
    }

    this.setQuickMenuActive(true, true)
    this.updateQuickMenuDock(deltaTime)
  }

  private captureQuickMenuGeometryTransforms(): void {
    this.ballTransform = this.findSceneObjectByName(
      "GolfGuide_Development"
    )?.getTransform() ?? null
    this.targetTransform = this.findSceneObjectByName(
      "Target_Anchor"
    )?.getTransform() ?? null
    this.practiceZoneTransform = this.findSceneObjectByName(
      "PracticeZone_Visual"
    )?.getTransform() ?? null
    this.holeTransform =
      this.findSceneObjectByName("HoleMarker_Visual")?.getTransform() ??
      this.findSceneObjectByName("HoleRim_Visual")?.getTransform() ??
      null
    this.aimHandleTransform = this.findSceneObjectByName(
      "AimHandle_Anchor"
    )?.getTransform() ?? null
    this.strokeHandleTransform = this.findSceneObjectByName(
      "StrokeHandle_Anchor"
    )?.getTransform() ?? null
    this.outcomeFeedbackTransform = this.findSceneObjectByName(
      "OutcomeFeedback_Root"
    )?.getTransform() ?? null
  }

  private updateQuickMenuDock(deltaTime: number): void {
    if (!this.quickMenuRoot || !this.cameraTransform || !this.cameraComponent) {
      return
    }

    const currentScore = this.getQuickMenuDockCollisionScore(
      this.quickMenuDock,
      QUICK_MENU_CURRENT_DOCK_MARGIN_UV
    )
    let desiredDock = this.quickMenuDock

    if (currentScore > 0) {
      const candidates: QuickMenuDock[] = [
        "lower-right",
        "lower-left",
        "upper-right",
        "upper-left",
      ]
      let bestScore = Number.MAX_SAFE_INTEGER
      const diagnosticScores: string[] = []
      for (const candidate of candidates) {
        const score = this.getQuickMenuDockCollisionScore(
          candidate,
          QUICK_MENU_GEOMETRY_MARGIN_UV
        )
        diagnosticScores.push(`${candidate}:${score}`)
        if (score < bestScore) {
          bestScore = score
          desiredDock = candidate
        }
        if (score === 0) {
          break
        }
      }
      if (!this.quickMenuDockDiagnosticsPrinted) {
        this.quickMenuDockDiagnosticsPrinted = true
        print(`[GolfCompactMenu] dockScores=${diagnosticScores.join(",")}`)
      }
      if (bestScore > 0 && !this.quickMenuDockDiagnosticsPrinted) {
        print("[GolfCompactMenu] all docks occupied; retaining full controls")
      }
    }

    if (desiredDock !== this.pendingQuickMenuDock) {
      this.pendingQuickMenuDock = desiredDock
      this.pendingQuickMenuDockElapsed = 0
    } else if (desiredDock !== this.quickMenuDock) {
      this.pendingQuickMenuDockElapsed += deltaTime
      if (
        this.pendingQuickMenuDockElapsed >= QUICK_MENU_DOCK_SWITCH_DELAY_SECONDS
      ) {
        this.quickMenuDock = desiredDock
        this.quickMenuDockTarget = this.getQuickMenuDockPosition(desiredDock)
        this.pendingQuickMenuDockElapsed = 0
        print(`[GolfCompactMenu] dock=${desiredDock}`)
      }
    } else {
      this.pendingQuickMenuDockElapsed = 0
    }

    const currentPosition = this.quickMenuRoot.getTransform().getLocalPosition()
    const blend = Math.min(1, deltaTime * QUICK_MENU_DOCK_BLEND_RATE)
    const nextPosition = currentPosition.add(
      this.quickMenuDockTarget.sub(currentPosition).uniformScale(blend)
    )
    this.quickMenuRoot.getTransform().setLocalPosition(nextPosition)
  }

  private getQuickMenuDockPosition(dock: QuickMenuDock): vec3 {
    const right = dock.endsWith("right")
      ? QUICK_MENU_RIGHT_CM
      : -QUICK_MENU_RIGHT_CM
    const up = dock.startsWith("upper")
      ? -QUICK_MENU_UP_CM
      : QUICK_MENU_UP_CM
    return new vec3(right, up, -QUICK_MENU_FORWARD_CM)
  }

  private getQuickMenuDockCollisionScore(
    dock: QuickMenuDock,
    margin: number
  ): number {
    const rect = this.getQuickMenuDockScreenRect(dock, margin)
    if (!rect) {
      return 100
    }
    if (
      rect.left < QUICK_MENU_SAFE_EDGE_UV ||
      rect.right > 1 - QUICK_MENU_SAFE_EDGE_UV ||
      rect.top < QUICK_MENU_SAFE_EDGE_UV ||
      rect.bottom > 1 - QUICK_MENU_SAFE_EDGE_UV
    ) {
      return 50
    }

    let score = 0
    const transforms = [
      this.ballTransform,
      this.targetTransform,
      this.practiceZoneTransform,
      this.holeTransform,
      this.strokeHandleTransform,
    ]
    for (const transform of transforms) {
      const screen = this.projectVisibleTransform(transform)
      if (screen && this.screenPointInsideRect(screen, rect)) {
        score += 2
      }
    }

    const lineStart = this.projectVisibleTransform(this.ballTransform)
    const lineEnd = this.projectVisibleTransform(
      this.aimHandleTransform ?? this.targetTransform
    )
    if (lineStart && lineEnd) {
      for (let index = 0; index <= 12; index += 1) {
        const progress = index / 12
        const sample = new vec2(
          lineStart.x + (lineEnd.x - lineStart.x) * progress,
          lineStart.y + (lineEnd.y - lineStart.y) * progress
        )
        if (this.screenPointInsideRect(sample, rect)) {
          score += 1
          break
        }
      }
    }
    if (this.menuPhase === "result" && this.outcomeFeedbackTransform) {
      const feedbackRect = this.getWorldUiScreenRect(
        this.outcomeFeedbackTransform.getWorldPosition(),
        GHOST_COACH_RESERVED_WIDTH_CM,
        GHOST_COACH_RESERVED_HEIGHT_CM,
        QUICK_MENU_GEOMETRY_MARGIN_UV
      )
      if (this.screenRectsOverlap(rect, feedbackRect)) {
        score += 4
      }
    }
    return score
  }

  private getQuickMenuDockScreenRect(
    dock: QuickMenuDock,
    margin: number
  ): ScreenRect | null {
    if (!this.cameraTransform || !this.cameraComponent) {
      return null
    }
    const dockPosition = this.getQuickMenuDockPosition(dock)
    return this.getCameraLocalScreenRect(
      dockPosition.add(new vec3(0, this.getCompactPanelUp(), 0)),
      COMPACT_PANEL_WIDTH_CM,
      this.getCompactPanelHeight(),
      margin
    )
  }

  private shouldShowQuickRangeStrip(): boolean {
    return (
      this.quickMenuActive &&
      getCompactMenuPresentation(this.menuPhase).rangeVisible
    )
  }

  private getWorldUiScreenRect(
    centerWorld: vec3,
    widthCm: number,
    heightCm: number,
    margin: number
  ): ScreenRect {
    const cameraRotation = this.cameraTransform!.getWorldRotation()
    const right = cameraRotation.multiplyVec3(vec3.right())
    const up = cameraRotation.multiplyVec3(vec3.up())
    const leftScreen = this.cameraComponent!.worldSpaceToScreenSpace(
      centerWorld.sub(right.uniformScale(widthCm / 2))
    )
    const rightScreen = this.cameraComponent!.worldSpaceToScreenSpace(
      centerWorld.add(right.uniformScale(widthCm / 2))
    )
    const topScreen = this.cameraComponent!.worldSpaceToScreenSpace(
      centerWorld.add(up.uniformScale(heightCm / 2))
    )
    const bottomScreen = this.cameraComponent!.worldSpaceToScreenSpace(
      centerWorld.sub(up.uniformScale(heightCm / 2))
    )
    return {
      left: Math.min(leftScreen.x, rightScreen.x) - margin,
      right: Math.max(leftScreen.x, rightScreen.x) + margin,
      top: Math.min(topScreen.y, bottomScreen.y) - margin,
      bottom: Math.max(topScreen.y, bottomScreen.y) + margin,
    }
  }

  private getCameraLocalScreenRect(
    centerLocal: vec3,
    widthCm: number,
    heightCm: number,
    margin: number
  ): ScreenRect {
    const center = this.projectCameraLocalPoint(centerLocal)
    const horizontal = this.projectCameraLocalPoint(
      centerLocal.add(new vec3(widthCm / 2, 0, 0))
    )
    const vertical = this.projectCameraLocalPoint(
      centerLocal.add(new vec3(0, heightCm / 2, 0))
    )
    const halfWidth = Math.abs(horizontal.x - center.x) + margin
    const halfHeight = Math.abs(vertical.y - center.y) + margin
    return {
      left: center.x - halfWidth,
      right: center.x + halfWidth,
      top: center.y - halfHeight,
      bottom: center.y + halfHeight,
    }
  }

  private projectCameraLocalPoint(localPosition: vec3): vec2 {
    const worldPosition = this.cameraTransform!.getWorldPosition().add(
      this.cameraTransform!
        .getWorldRotation()
        .multiplyVec3(localPosition)
    )
    return this.cameraComponent!.worldSpaceToScreenSpace(worldPosition)
  }

  private projectVisibleTransform(transform: Transform | null): vec2 | null {
    if (!transform || !this.cameraComponent) {
      return null
    }
    if (this.getTransformViewDot(transform) <= 0.1) {
      return null
    }
    const screen = this.cameraComponent.worldSpaceToScreenSpace(
      transform.getWorldPosition()
    )
    // Keep modestly off-screen endpoints so a visible line segment that crosses the
    // viewport is still considered even when its ball or handle is just outside it.
    return screen.x >= -4 && screen.x <= 4 && screen.y >= -4 && screen.y <= 4
      ? screen
      : null
  }

  private screenPointInsideRect(point: vec2, rect: ScreenRect): boolean {
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    )
  }

  private screenRectsOverlap(first: ScreenRect, second: ScreenRect): boolean {
    return !(
      first.right < second.left ||
      first.left > second.right ||
      first.bottom < second.top ||
      first.top > second.bottom
    )
  }

  private setFullMenuPresentationVisible(visible: boolean): void {
    if (this.fullMenuPresentationVisible === visible) {
      return
    }
    this.fullMenuPresentationVisible = visible
    this.applyMenuView()
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
    _immediate: boolean
  ): void {
    if (!this.quickMenuRoot) {
      return
    }

    const changed = this.quickMenuActive !== active
    this.quickMenuActive = active
    this.setFullMenuPresentationVisible(false)
    this.quickMenuRoot.enabled = active
    this.refreshQuickActions()

    if (changed) {
      print(`[GolfCompactMenu] visible=${active} phase=${this.menuPhase}`)
    }
  }

  private createPlacementCrosshair(): void {
    const anchor = this.findSceneObjectByName("PlacementHandle_Anchor")
    const visual = this.findSceneObjectByName("PlacementHandle_Visual")
    if (!anchor || !visual) {
      console.warn("[GolfPlacementUI] Placement crosshair unavailable")
      return
    }
    const oldVisual = visual.getComponent(
      "Component.RenderMeshVisual"
    ) as RenderMeshVisual
    if (oldVisual) {
      oldVisual.enabled = false
    }

    const root = global.scene.createSceneObject("PlacementHandle_Crosshair")
    root.setParent(anchor)
    root.getTransform().setLocalPosition(new vec3(0, -5.65, 0))
    root.getTransform().setLocalRotation(
      quat.fromEulerAngles(MathUtils.DegToRad * -90, 0, 0)
    )
    const text = root.createComponent("Component.Text") as Text
    text.text = "+"
    text.size = 180
    text.weight = 700
    text.depthTest = true
    text.textFill.color = new vec4(0.15, 0.95, 1, 1)
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Overflow
    text.verticalOverflow = VerticalOverflow.Overflow
    text.layoutRect = Rect.create(-6, 6, -6, 6)
    this.placementCrosshairRoot = root
    this.placementCrosshairText = text

    const tooltipRoot = global.scene.createSceneObject(
      "PlacementHandle_MoveSetupTooltip"
    )
    tooltipRoot.setParent(root)
    tooltipRoot.getTransform().setLocalPosition(new vec3(8.5, 0, 0.1))
    const tooltip = tooltipRoot.createComponent("Component.Text") as Text
    tooltip.text = "Move Setup"
    tooltip.size = 44
    tooltip.weight = 700
    tooltip.depthTest = true
    tooltip.textFill.color = new vec4(0.65, 1, 1, 1)
    tooltip.horizontalAlignment = HorizontalAlignment.Center
    tooltip.verticalAlignment = VerticalAlignment.Center
    tooltip.horizontalOverflow = HorizontalOverflow.Shrink
    tooltip.verticalOverflow = VerticalOverflow.Overflow
    tooltip.layoutRect = Rect.create(-6.5, 6.5, -1.8, 1.8)
    tooltipRoot.enabled = false
    this.placementTooltipRoot = tooltipRoot
  }

  public setPlacementHandleHovered(hovered: boolean): void {
    this.placementHandleHovered = hovered
    this.refreshPlacementCrosshairFeedback()
  }

  public setPlacementHandleActive(active: boolean): void {
    this.placementHandleActive = active
    this.refreshPlacementCrosshairFeedback()
  }

  private refreshPlacementCrosshairFeedback(): void {
    if (!this.placementCrosshairRoot || !this.placementCrosshairText) {
      return
    }
    const scale = this.placementHandleActive
      ? 1.24
      : this.placementHandleHovered
        ? 1.12
        : 1
    this.placementCrosshairRoot
      .getTransform()
      .setLocalScale(new vec3(scale, scale, 1))
    this.placementCrosshairText.textFill.color = this.placementHandleActive
      ? new vec4(1, 1, 1, 1)
      : this.placementHandleHovered
        ? new vec4(0.65, 1, 1, 1)
        : new vec4(0.15, 0.95, 1, 1)
    if (this.placementTooltipRoot) {
      this.placementTooltipRoot.enabled =
        this.menuPhase === "placement" &&
        (this.placementHandleHovered || this.placementHandleActive)
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
  ): {object: SceneObject; label: Text} {
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
    return {object, label: labelText}
  }

  private createRangeButton(
    parent: SceneObject,
    distance: PracticeRangeDistanceFt
  ): void {
    const object = global.scene.createSceneObject(`PracticeRange_${distance}ft_Control`)
    object.setParent(parent)
    const button = object.createComponent(Button.getTypeName()) as Button
    button.setVariant({
      theme: "SnapOS3",
      shape: "Rectangle",
      style: distance === this.selectedPracticeDistanceFt ? "Primary" : "Secondary",
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
      `PracticeRange_${distance}ft_Label`
    )
    labelObject.setParent(object)
    labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    const label = labelObject.createComponent("Component.Text") as Text
    label.text = `${distance} ft`
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
        entry.distance === this.selectedPracticeDistanceFt ? 1 : 0.65
    }
  }
}
