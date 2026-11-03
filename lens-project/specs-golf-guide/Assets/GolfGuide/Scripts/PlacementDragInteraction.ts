// Copyright 2026 Specs Inc.
// SPDX-License-Identifier: Apache-2.0

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Interactor} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * SIK-backed drag handle for moving a separate root on the simulated floor.
 * The manipulated root can translate only in world X/Z; its authored floor Y,
 * rotation, scale, and child spacing remain unchanged.
 */
@component
export class PlacementDragInteraction extends BaseScriptComponent {
  @input
  manipulateRoot!: SceneObject

  public readonly onDragStart = new Event<void>()
  public readonly onDragEnd = new Event<void>()
  public readonly onDragUpdate = new Event<vec3>()

  private interactable!: Interactable
  private dragging = false
  private interactionEnabled = false
  private dragStartFloorPoint = vec3.zero()
  private dragStartRootPosition = vec3.zero()

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
        if (!floorPoint) {
          return
        }

        this.dragStartRootPosition = this.manipulateRoot.getTransform().getWorldPosition()
        this.dragStartFloorPoint = floorPoint
        this.dragging = true
        this.onDragStart.invoke()
        print("[GolfPlacement] handle drag start")
      })

      this.interactable.onTriggerUpdate.add((event) => {
        if (!this.dragging || !this.interactionEnabled) {
          return
        }

        const floorPoint = this.resolveFloorPoint(event.interactor)
        if (!floorPoint) {
          return
        }

        this.applyFloorPoint(floorPoint)
      })

      const finishDrag = (event: InteractorEvent) => {
        if (!this.dragging) {
          return
        }
        const floorPoint = this.resolveFloorPoint(event.interactor)
        if (floorPoint) {
          this.applyFloorPoint(floorPoint)
        }
        this.dragging = false
        this.onDragEnd.invoke()
        print("[GolfPlacement] handle drag end")
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
    shape.size = new vec3(12, 6, 12)
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
    const floorY = this.dragStartRootPosition.y
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

  private applyFloorPoint(floorPoint: vec3): void {
    const delta = floorPoint.sub(this.dragStartFloorPoint)
    const nextPosition = new vec3(
      this.dragStartRootPosition.x + delta.x,
      this.dragStartRootPosition.y,
      this.dragStartRootPosition.z + delta.z
    )
    this.manipulateRoot.getTransform().setWorldPosition(nextPosition)
    this.onDragUpdate.invoke(nextPosition)
  }
}
