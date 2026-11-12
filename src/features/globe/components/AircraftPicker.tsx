"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Vector3 } from "three";
import type { Icao24 } from "@/features/flights/domain/aircraft";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import type { AircraftSimulation } from "../lib/aircraft-simulation";
import { isInFrontOfHorizon } from "../lib/view";

const PICK_RADIUS_PX = 14;
/** A press that travels further than this is a globe drag, not a click. */
const CLICK_TOLERANCE_PX = 5;

interface AircraftPickerProps {
  readonly simulation: AircraftSimulation;
}

/**
 * Screen-space picking: the aircraft whose icon is nearest to the pointer
 * wins. Far more forgiving than ray-casting against tiny triangles.
 */
export function AircraftPicker({ simulation }: AircraftPickerProps) {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const projected = new Vector3();
    let pressStart: { x: number; y: number } | null = null;
    let pendingHover: PointerEvent | null = null;
    let hoverFrame = 0;

    const pick = (event: PointerEvent): Icao24 | null => {
      const bounds = canvas.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;

      let nearest: Icao24 | null = null;
      let nearestDistanceSq = PICK_RADIUS_PX * PICK_RADIUS_PX;
      for (const entity of simulation.entities) {
        if (!entity.visible || !isInFrontOfHorizon(entity, camera)) continue;
        projected
          .set(entity.upX, entity.upY, entity.upZ)
          .multiplyScalar(entity.radius)
          .project(camera);
        const dx = (projected.x * 0.5 + 0.5) * bounds.width - pointerX;
        const dy = (0.5 - projected.y * 0.5) * bounds.height - pointerY;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < nearestDistanceSq) {
          nearestDistanceSq = distanceSq;
          nearest = entity.aircraft.icao24;
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
        const hovered = pendingHover.buttons === 0 ? pick(pendingHover) : null;
        useFlightsStore.getState().hover(hovered);
        canvas.style.setProperty("cursor", hovered === null ? "grab" : "pointer");
      });
    };

    const onPointerDown = (event: PointerEvent): void => {
      pressStart = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (pressStart === null) return;
      const travelled = Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y);
      pressStart = null;
      if (travelled <= CLICK_TOLERANCE_PX) useFlightsStore.getState().select(pick(event));
    };

    const onPointerLeave = (): void => {
      pendingHover = null;
      useFlightsStore.getState().hover(null);
    };

    canvas.style.setProperty("cursor", "grab");
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
    };
  }, [simulation, camera, canvas]);

  return null;
}
