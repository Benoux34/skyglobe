"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Vector3 } from "three";
import { isHiddenByEarth } from "./view";

/** A press that travels further than this is a globe drag, not a click. */
const CLICK_TOLERANCE_PX = 5;

/** A cloud of points that can be picked with the pointer. */
export interface PickablePoints {
  readonly count: number;
  /** Scene position of every point, xyz. */
  readonly positions: Float32Array;
  isShown(index: number): boolean;
}

export interface PointPicking {
  readonly points: PickablePoints;
  /** How close to a point, in pixels, the pointer has to be. */
  readonly radiusPx: number;
  /** True when something with a higher priority already took the pointer. */
  isHoverTaken(): boolean;
  /** True when something with a higher priority has just been selected by this click. */
  isClickTaken(): boolean;
  /** Called with the index of the point under the pointer, or -1. */
  onHover(index: number): void;
  /** Called with the index of the clicked point, or -1 for a click on nothing. */
  onSelect(index: number): void;
}

/**
 * Screen-space picking: the point nearest to the pointer wins. Far more
 * forgiving than ray-casting against tiny shapes.
 *
 * `picking` must keep the same identity between renders, or the listeners are
 * registered again on each of them.
 */
export function usePointPicker(picking: PointPicking): void {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const { points, radiusPx } = picking;
    const projected = new Vector3();
    let pressStart: { x: number; y: number } | null = null;
    let pendingHover: PointerEvent | null = null;
    let hoverFrame = 0;

    const pick = (event: PointerEvent): number => {
      const bounds = canvas.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      const { positions } = points;

      let nearest = -1;
      let nearestDistanceSq = radiusPx * radiusPx;
      for (let index = 0; index < points.count; index++) {
        if (!points.isShown(index)) continue;
        const x = positions[index * 3] ?? 0;
        const y = positions[index * 3 + 1] ?? 0;
        const z = positions[index * 3 + 2] ?? 0;
        if (isHiddenByEarth(x, y, z, camera.position)) continue;

        projected.set(x, y, z).project(camera);
        // Behind the camera, which happens when it sits inside the higher orbits.
        if (projected.z > 1) continue;
        const dx = (projected.x * 0.5 + 0.5) * bounds.width - pointerX;
        const dy = (0.5 - projected.y * 0.5) * bounds.height - pointerY;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < nearestDistanceSq) {
          nearestDistanceSq = distanceSq;
          nearest = index;
        }
      }
      return nearest;
    };

    const onPointerMove = (event: PointerEvent): void => {
      pendingHover = event;
      if (hoverFrame !== 0) return;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        if (pendingHover === null) return;
        // While dragging the globe, hovering would only cause flicker.
        const hovered =
          pendingHover.buttons === 0 && !picking.isHoverTaken() ? pick(pendingHover) : -1;
        picking.onHover(hovered);
        if (hovered >= 0) canvas.style.setProperty("cursor", "pointer");
      });
    };

    const onPointerDown = (event: PointerEvent): void => {
      pressStart = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (pressStart === null) return;
      const travelled = Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y);
      pressStart = null;
      if (travelled > CLICK_TOLERANCE_PX || picking.isClickTaken()) return;
      picking.onSelect(pick(event));
    };

    const onPointerLeave = (): void => {
      pendingHover = null;
      picking.onHover(-1);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    return () => {
      cancelAnimationFrame(hoverFrame);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      picking.onHover(-1);
    };
  }, [picking, camera, canvas]);
}
