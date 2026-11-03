// Copyright 2026 Specs Inc.
// SPDX-License-Identifier: Apache-2.0

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Interactor} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * SIK-backed aiming handle constrained to the floor-forward hemisphere.
 * It emits a normalized world-space X/Z direction and never moves the target.
 */
@component
export class AimDragInteraction extends BaseScriptComponent {
  @input
  ballAnchor!: SceneObject

  @input
  targetAnchor!: SceneObject

  public readonly onDragStart = new Event<void>()
  public readonly onDragEnd = new Event<void>()
  public readonly onDragUpdate = new Event<vec3>()

  private interactable!: Interactable
  private dragging = false
  private interactionEnabled = false

  onAwake(): void {
    this.ensureCollider()
    this.ensureInteractable()
    this.setInteractionEnabled(false)

    this.createEvent("OnStartEvent").bind(() => {
      this.interactable.onTriggerStart.add((event) => {
        if (!this.interactionEnabled) {
          return
        }

        const floorPoint = this.resolveFloorPoint(event.interactor)
        if (!floorPoint || !this.emitDirection(floorPoint)) {
          return
        }

        this.dragging = true
        this.onDragStart.invoke()
        print("[GolfAim] handle drag start")
      })

      this.interactable.onTriggerUpdate.add((event) => {
        if (!this.dragging || !this.interactionEnabled) {
          return
        }

        const floorPoint = this.resolveFloorPoint(event.interactor)
        if (floorPoint) {
          this.emitDirection(floorPoint)
        }
      })

      const finishDrag = (event: InteractorEvent) => {
        if (!this.dragging) {
          return
        }

        const floorPoint = this.resolveFloorPoint(event.interactor)
        if (floorPoint) {
          this.emitDirection(floorPoint)
        }
        this.dragging = false
        this.onDragEnd.invoke()
        print("[GolfAim] handle drag end")
      }

      this.interactable.onTriggerEnd.add(finishDrag)
      this.interactable.onTriggerEndOutside.add(finishDrag)
    })
  }

  public setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = enabled
    if (this.interactable) {
      this.interactable.enabled = enabled
    }
    if (!enabled) {
      this.dragging = false
    }
  }

  private ensureCollider(): void {
    let collider = this.sceneObject.getComponent("Physics.ColliderComponent") as ColliderComponent
    if (!collider) {
      collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    }
    const shape = Shape.createBoxShape()
    shape.size = new vec3(12, 12, 12)
    collider.shape = shape
    collider.debugDrawEnabled = false
  }

  private ensureInteractable(): void {
    this.interactable = this.sceneObject.getComponent(Interactable.getTypeName()) as Interactable
    if (!this.interactable) {
      this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
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

  private emitDirection(floorPoint: vec3): boolean {
    const ballPosition = this.ballAnchor.getTransform().getWorldPosition()
    const targetPosition = this.targetAnchor.getTransform().getWorldPosition()
    const candidate = new vec3(
      floorPoint.x - ballPosition.x,
      0,
      floorPoint.z - ballPosition.z
    )
    const targetDirection = new vec3(
      targetPosition.x - ballPosition.x,
      0,
      targetPosition.z - ballPosition.z
    )

    if (
      !Number.isFinite(candidate.x) ||
      !Number.isFinite(candidate.z) ||
      candidate.length <= 0.0001 ||
      targetDirection.length <= 0.0001
    ) {
      return false
    }

    const direction = candidate.normalize()
    if (direction.dot(targetDirection.normalize()) <= 0.001) {
      return false
    }

    this.onDragUpdate.invoke(direction)
    return true
  }
}
