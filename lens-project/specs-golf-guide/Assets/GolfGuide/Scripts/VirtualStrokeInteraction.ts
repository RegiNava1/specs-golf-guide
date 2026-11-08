// Copyright 2026 Specs Inc.
// SPDX-License-Identifier: Apache-2.0

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Interactor} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

import {
  DeterministicStrokeModel,
  type StrokeOutcome,
} from "./StrokeSimulation"
import {
  VirtualStrokeInputAdapter,
  type CapturedVirtualStroke,
} from "./StrokeInputAdapter"

export interface VirtualStrokeCapture {
  readonly direction: vec3
  readonly endpoint: vec3
  readonly strength: number
  readonly outcome: StrokeOutcome
}

/**
 * VirtualStrokeInteraction owns one SIK-backed floor stroke gesture.
 * Inputs: authored ball and target anchors. It emits one deterministic impact
 * and must not move the ball, target, camera, or gameplay state directly.
 */
@component
export class VirtualStrokeInteraction extends BaseScriptComponent {
  @ui.label(
    '<span style="color: #60A5FA;">VirtualStrokeInteraction – deterministic floor stroke</span>'
  )
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Floor anchor for the golf ball")
  ballAnchor!: SceneObject

  @input
  @hint("Stationary practice-target anchor")
  targetAnchor!: SceneObject
  @ui.group_end

  public readonly onStrokeCaptured = new Event<VirtualStrokeCapture>()
  public readonly onStrokeCancelled = new Event<string>()

  private interactable!: Interactable
  private adapter: VirtualStrokeInputAdapter | null = null
  private interactionEnabled = false
  private dragging = false
  private forwardStrokeStarted = false
  private aimDirection = new vec3(0, 0, -1)
  private currentBallWorldPosition = vec3.zero()
  private initialLocalPosition = vec3.zero()
  private handleWorldY = 0

  onAwake(): void {
    this.initialLocalPosition = this.sceneObject.getTransform().getLocalPosition()
    this.handleWorldY = this.sceneObject.getTransform().getWorldPosition().y
    this.ensureCollider()
    this.ensureInteractable()
    this.setInteractionEnabled(false)

    this.createEvent("OnStartEvent").bind(() => {
      this.currentBallWorldPosition =
        this.ballAnchor.getTransform().getWorldPosition()
      this.interactable.onTriggerStart.add((event) => this.startGesture(event))
      this.interactable.onTriggerUpdate.add((event) => this.updateGesture(event))

      const finishGesture = (event: InteractorEvent) => this.finishGesture(event)
      this.interactable.onTriggerEnd.add(finishGesture)
      this.interactable.onTriggerEndOutside.add(finishGesture)
      this.interactable.onTriggerCanceled.add(() => {
        if (this.dragging) {
          this.cancelGesture("trigger-cancelled")
        }
      })
    })
  }

  public setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = enabled
    if (this.interactable) {
      this.interactable.enabled = enabled
    }
    if (!enabled) {
      this.resetInput()
    }
  }

  public setAimDirection(direction: vec3): boolean {
    const planar = new vec3(direction.x, 0, direction.z)
    if (
      !Number.isFinite(planar.x) ||
      !Number.isFinite(planar.z) ||
      planar.length <= 0.0001
    ) {
      return false
    }

    this.aimDirection = planar.normalize()
    return true
  }

  public resetInput(): void {
    if (this.adapter) {
      this.adapter.resetInput()
    }
    this.adapter = null
    this.dragging = false
    this.forwardStrokeStarted = false
    this.restoreHandle()
  }

  /**
   * Arms one manual gesture against the ball's current world-space position.
   * The authored Ball_Anchor remains the setup reference, while multi-putt
   * sessions move the visible ball independently after every completed roll.
   */
  public prepareForStroke(ballWorldPosition: vec3, direction: vec3): boolean {
    if (
      this.dragging ||
      !this.setBallWorldPosition(ballWorldPosition) ||
      !this.setAimDirection(direction)
    ) {
      return false
    }

    this.resetInput()
    this.interactionEnabled = true
    // A handle disabled during rolling/result must be re-registered with SIK
    // after its SceneObject is visible again. The bounded false→true toggle
    // also clears any stale pointer ownership from the previous gesture.
    this.interactable.enabled = false
    this.interactable.enabled = true

    const handle = this.sceneObject.getTransform().getWorldPosition()
    const addressDistance = new vec3(
      handle.x - this.currentBallWorldPosition.x,
      0,
      handle.z - this.currentBallWorldPosition.z
    ).length
    console.log(
      `[GolfStrokeInput] action=ARM ball=(${this.currentBallWorldPosition.x.toFixed(
        2
      )},${this.currentBallWorldPosition.z.toFixed(2)}) handle=(${handle.x.toFixed(
        2
      )},${handle.z.toFixed(2)}) addressDistanceCm=${addressDistance.toFixed(
        2
      )} enabled=${this.interactable.enabled}`
    )
    return true
  }

  public setBallWorldPosition(position: vec3): boolean {
    if (
      this.dragging ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      return false
    }
    this.currentBallWorldPosition = new vec3(position.x, position.y, position.z)
    return true
  }

  /** Rebase the gesture's resting handle after a completed multi-putt shot. */
  public setRestWorldPosition(position: vec3): boolean {
    if (
      this.dragging ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      return false
    }
    this.sceneObject.getTransform().setWorldPosition(position)
    this.initialLocalPosition = this.sceneObject.getTransform().getLocalPosition()
    this.handleWorldY = position.y
    this.adapter = null
    this.forwardStrokeStarted = false
    return true
  }

  private startGesture(event: InteractorEvent): void {
    if (!this.interactionEnabled || this.dragging) {
      return
    }

    const ball = this.currentBallWorldPosition
    const target = this.targetAnchor.getTransform().getWorldPosition()
    const model = new DeterministicStrokeModel({
      ball: this.toLogicPoint(ball),
      target: this.toLogicPoint(target),
      selectedAimDirection: {
        x: this.aimDirection.x,
        y: -this.aimDirection.z,
      },
    })
    this.adapter = new VirtualStrokeInputAdapter(model)

    const handlePosition = this.sceneObject.getTransform().getWorldPosition()
    const addressPoint = new vec3(handlePosition.x, ball.y, handlePosition.z)
    if (!this.adapter.addressBall(this.toLogicPoint(addressPoint))) {
      const addressDistance = new vec3(
        addressPoint.x - ball.x,
        0,
        addressPoint.z - ball.z
      ).length
      console.warn(
        `[GolfStrokeInput] action=ADDRESS_REJECTED distanceCm=${addressDistance.toFixed(
          2
        )} ball=(${ball.x.toFixed(2)},${ball.z.toFixed(
          2
        )}) handle=(${addressPoint.x.toFixed(2)},${addressPoint.z.toFixed(2)})`
      )
      this.cancelGesture("address-rejected")
      return
    }
    if (!this.adapter.startBackswing()) {
      this.cancelGesture("backswing-start-rejected")
      return
    }

    const floorPoint = this.resolveFloorPoint(event.interactor)
    if (floorPoint) {
      this.moveHandle(floorPoint)
    }
    this.dragging = true
    this.forwardStrokeStarted = false
    console.log("[GolfStroke] state=backswing")
  }

  private updateGesture(event: InteractorEvent): void {
    if (!this.dragging || !this.interactionEnabled || !this.adapter) {
      return
    }

    const floorPoint = this.resolveFloorPoint(event.interactor)
    if (!floorPoint) {
      return
    }

    this.processGesturePoint(floorPoint)
  }

  private processGesturePoint(floorPoint: vec3): void {
    if (!this.adapter) {
      return
    }

    const logicPoint = this.toLogicPoint(floorPoint)
    if (this.adapter.phase === "backswing") {
      if (!this.adapter.trackBackswing(logicPoint)) {
        this.cancelGesture("invalid-backswing")
        return
      }
      if (this.adapter.canStartForwardStroke(logicPoint)) {
        if (!this.adapter.startForwardStroke(logicPoint)) {
          this.cancelGesture("forward-transition-rejected")
          return
        }
        this.forwardStrokeStarted = true
        console.log("[GolfStroke] state=forward-stroke")
      }
    } else if (
      this.adapter.phase === "forward-stroke" &&
      !this.adapter.trackForwardStroke(logicPoint)
    ) {
      this.cancelGesture("invalid-forward-stroke")
      return
    }

    this.moveHandle(floorPoint)
  }

  private finishGesture(event: InteractorEvent): void {
    if (!this.dragging || !this.adapter) {
      return
    }

    const floorPoint = this.resolveFloorPoint(event.interactor)
    if (!floorPoint) {
      this.cancelGesture("release-without-floor-point")
      return
    }

    // Some Preview mouse paths coalesce a very fast drag into start/end only.
    // Process the release point through the same deterministic transition so
    // that a valid stroke is not mistaken for an incomplete gesture.
    this.processGesturePoint(floorPoint)
    if (!this.dragging || !this.adapter) {
      return
    }

    const capture = this.adapter.completeStroke(this.toLogicPoint(floorPoint))
    if (!capture || !this.forwardStrokeStarted) {
      this.cancelGesture("incomplete-stroke")
      return
    }

    const worldCapture = this.toWorldCapture(capture)
    this.dragging = false
    this.forwardStrokeStarted = false
    this.restoreHandle()
    console.log(
      `[GolfStroke] action=IMPACT strength=${worldCapture.strength.toFixed(
        3
      )} direction=(${worldCapture.direction.x.toFixed(4)},${worldCapture.direction.z.toFixed(
        4
      )}) endpoint=(${worldCapture.endpoint.x.toFixed(2)},${worldCapture.endpoint.z.toFixed(
        2
      )})`
    )
    this.onStrokeCaptured.invoke(worldCapture)
  }

  private cancelGesture(reason: string): void {
    if (this.adapter) {
      this.adapter.cancelStroke()
    }
    this.adapter = null
    this.dragging = false
    this.forwardStrokeStarted = false
    this.restoreHandle()
    console.log(`[GolfStroke] action=CANCEL reason=${reason}`)
    this.onStrokeCancelled.invoke(reason)
  }

  private ensureCollider(): void {
    let collider = this.sceneObject.getComponent(
      "Physics.ColliderComponent"
    ) as ColliderComponent
    if (!collider) {
      collider = this.sceneObject.createComponent(
        "Physics.ColliderComponent"
      ) as ColliderComponent
    }
    const shape = Shape.createBoxShape()
    shape.size = new vec3(12, 6, 12)
    collider.shape = shape
    collider.debugDrawEnabled = false
  }

  private ensureInteractable(): void {
    this.interactable = this.sceneObject.getComponent(
      Interactable.getTypeName()
    ) as Interactable
    if (!this.interactable) {
      this.interactable = this.sceneObject.createComponent(
        Interactable.getTypeName()
      ) as Interactable
    }
    this.interactable.targetingMode = 3
  }

  private resolveFloorPoint(interactor: Interactor): vec3 | null {
    const floorY = this.ballAnchor.getTransform().getWorldPosition().y
    const rayOrigin = interactor.startPoint
    const rayDirection = interactor.direction

    if (rayOrigin && rayDirection && Math.abs(rayDirection.y) > 0.0001) {
      const distance = (floorY - rayOrigin.y) / rayDirection.y
      if (Number.isFinite(distance) && distance >= 0) {
        return rayOrigin.add(rayDirection.uniformScale(distance))
      }
    }

    const hit = interactor.targetHitPosition ?? interactor.endPoint
    return hit ? new vec3(hit.x, floorY, hit.z) : null
  }

  private moveHandle(floorPoint: vec3): void {
    this.sceneObject
      .getTransform()
      .setWorldPosition(new vec3(floorPoint.x, this.handleWorldY, floorPoint.z))
  }

  private restoreHandle(): void {
    this.sceneObject.getTransform().setLocalPosition(this.initialLocalPosition)
    this.handleWorldY = this.sceneObject.getTransform().getWorldPosition().y
  }

  private toLogicPoint(point: vec3): {x: number; y: number} {
    return {x: point.x, y: -point.z}
  }

  private toWorldCapture(capture: CapturedVirtualStroke): VirtualStrokeCapture {
    const ballWorld = this.currentBallWorldPosition
    return {
      direction: new vec3(capture.direction.x, 0, -capture.direction.y),
      endpoint: new vec3(
        capture.outcome.endpoint.x,
        ballWorld.y,
        -capture.outcome.endpoint.y
      ),
      strength: capture.strength,
      outcome: capture.outcome,
    }
  }
}
