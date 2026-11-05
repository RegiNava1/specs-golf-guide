import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import type {GhostCoachFeedback} from "./GhostCoach"
import {PuttClassification} from "./GolfOutcome"

const PANEL_WIDTH_CM = 30
const PANEL_HEIGHT_CM = 8
const OUTCOME_TEXT_SIZE = 126
const COACH_PANEL_WIDTH_CM = 40
const COACH_PANEL_HEIGHT_CM = 22
const COACH_OUTCOME_Y_CM = 7.2
const COACH_OUTCOME_TEXT_SIZE = 126
const COACH_TIP_TEXT_SIZE = 82
const COACH_PATH_TEXT_SIZE = 64
const COACH_INTENDED_COLOR = new vec4(0, 1, 1, 1)
const COACH_ACTUAL_COLOR = new vec4(1, 0.55, 0.1, 1)

/** Target-adjacent UIKit feedback shown only after a completed roll. */
@component
export class GolfOutcomeFeedbackUI extends BaseScriptComponent {
  private outcomeBackPlate!: BackPlate
  private outcomeContent!: ElementContent
  private outcomeLabelTransform!: Transform
  private coachTip!: Text
  private intendedPath!: Text
  private actualPath!: Text

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.outcomeBackPlate = this.sceneObject.createComponent(
      BackPlate.getTypeName()
    ) as BackPlate
    this.outcomeBackPlate.size = new vec2(PANEL_WIDTH_CM, PANEL_HEIGHT_CM)

    const label = global.scene.createSceneObject("OutcomeFeedback_Label")
    label.setParent(this.sceneObject)
    label.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    this.outcomeLabelTransform = label.getTransform()
    this.outcomeContent = label.createComponent(
      ElementContent.getTypeName()
    ) as ElementContent
    this.outcomeContent.text = "On Target"
    this.outcomeContent.textSize = OUTCOME_TEXT_SIZE
    this.outcomeContent.contentAlignment = "center"
    this.outcomeContent.sizeOverride = new vec2(PANEL_WIDTH_CM - 2, PANEL_HEIGHT_CM - 1)

    this.coachTip = this.createCoachText(
      "GhostCoach_Tip",
      1.4,
      COACH_TIP_TEXT_SIZE,
      new vec4(1, 1, 1, 1)
    )
    this.intendedPath = this.createCoachText(
      "GhostCoach_IntendedPath",
      -4.4,
      COACH_PATH_TEXT_SIZE,
      COACH_INTENDED_COLOR
    )
    this.actualPath = this.createCoachText(
      "GhostCoach_ActualPath",
      -7.6,
      COACH_PATH_TEXT_SIZE,
      COACH_ACTUAL_COLOR
    )
    this.coachTip.horizontalOverflow = HorizontalOverflow.Wrap
    this.coachTip.layoutRect = Rect.create(-18.5, 18.5, -2.5, 2.5)

    this.createEvent("OnStartEvent").bind(() => this.hide())
  }

  public hide(): void {
    this.outcomeBackPlate.enabled = false
    this.outcomeContent.opacity = 0
    this.setCoachVisible(false)
  }

  public showOutcome(outcome: PuttClassification): void {
    this.hide()
    this.outcomeBackPlate.size = new vec2(PANEL_WIDTH_CM, PANEL_HEIGHT_CM)
    this.outcomeLabelTransform.setLocalPosition(new vec3(0, 0, 0.6))
    this.outcomeContent.text = outcome
    this.outcomeContent.textSize = OUTCOME_TEXT_SIZE
    this.outcomeContent.sizeOverride = new vec2(
      PANEL_WIDTH_CM - 2,
      PANEL_HEIGHT_CM - 1
    )
    this.outcomeBackPlate.enabled = true
    this.outcomeContent.opacity = 1
  }

  public showGhostCoach(feedback: GhostCoachFeedback): void {
    this.hide()
    this.outcomeBackPlate.size = new vec2(
      COACH_PANEL_WIDTH_CM,
      COACH_PANEL_HEIGHT_CM
    )
    this.outcomeLabelTransform.setLocalPosition(
      new vec3(0, COACH_OUTCOME_Y_CM, 0.6)
    )
    this.outcomeContent.text = feedback.outcome
    this.outcomeContent.textSize = COACH_OUTCOME_TEXT_SIZE
    this.outcomeContent.sizeOverride = new vec2(COACH_PANEL_WIDTH_CM - 2, 5)
    this.coachTip.text = feedback.tip.replace("—", "—\n")
    this.intendedPath.text = feedback.intendedPath
    this.actualPath.text = feedback.actualPath
    this.outcomeBackPlate.enabled = true
    this.outcomeContent.opacity = 1
    this.setCoachVisible(true)
  }

  private createCoachText(
    name: string,
    localY: number,
    size: number,
    color: vec4
  ): Text {
    const object = global.scene.createSceneObject(name)
    object.setParent(this.sceneObject)
    object.getTransform().setLocalPosition(new vec3(0, localY, 0.7))
    const text = object.createComponent("Component.Text") as Text
    text.text = ""
    text.size = size
    text.weight = 700
    text.depthTest = true
    text.textFill.color = color
    text.horizontalAlignment = HorizontalAlignment.Center
    text.verticalAlignment = VerticalAlignment.Center
    text.horizontalOverflow = HorizontalOverflow.Shrink
    text.verticalOverflow = VerticalOverflow.Overflow
    text.layoutRect = Rect.create(-18.5, 18.5, -1.6, 1.6)
    object.enabled = false
    return text
  }

  private setCoachVisible(visible: boolean): void {
    this.coachTip.getSceneObject().enabled = visible
    this.intendedPath.getSceneObject().enabled = visible
    this.actualPath.getSceneObject().enabled = visible
  }
}
