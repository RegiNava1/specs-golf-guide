import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {PuttClassification} from "./GolfOutcome"

const PANEL_WIDTH_CM = 30
const PANEL_HEIGHT_CM = 6
const OUTCOME_TEXT_SIZE = 42

/** Target-adjacent UIKit feedback shown only after a completed roll. */
@component
export class GolfOutcomeFeedbackUI extends BaseScriptComponent {
  private outcomeContent!: ElementContent

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const label = global.scene.createSceneObject("OutcomeFeedback_Label")
    label.setParent(this.sceneObject)
    label.getTransform().setLocalPosition(new vec3(0, 0, 0))
    this.outcomeContent = label.createComponent(
      ElementContent.getTypeName()
    ) as ElementContent
    this.outcomeContent.text = "On Target"
    this.outcomeContent.textSize = OUTCOME_TEXT_SIZE
    this.outcomeContent.contentAlignment = "center"
    this.outcomeContent.sizeOverride = new vec2(PANEL_WIDTH_CM - 2, PANEL_HEIGHT_CM - 1)

    this.createEvent("OnStartEvent").bind(() => this.hide())
  }

  public hide(): void {
    this.outcomeContent.opacity = 0
  }

  public showOutcome(outcome: PuttClassification): void {
    this.outcomeContent.text = outcome
    this.outcomeContent.opacity = 1
  }
}
