import type { Camera } from "three";
import { clamp } from "@/shared/lib/units";
import type { SimulatedAircraft } from "./aircraft-simulation";

export const CAMERA_MIN_DISTANCE = 1.22;
export const CAMERA_MAX_DISTANCE = 6;
export const CAMERA_INITIAL_DISTANCE = 2.9;
export const CAMERA_PORTRAIT_DISTANCE = 4.4;

/**
 * World-space size of an aircraft icon. Icons shrink as the camera approaches
 * so they stay roughly constant on screen without swallowing the map.
 */
export function aircraftIconScale(cameraDistance: number): number {
  return clamp((cameraDistance - 1) * 0.0058, 0.0009, 0.03);
}

/** True when the Earth does not hide the aircraft from the camera. */
export function isInFrontOfHorizon(entity: SimulatedAircraft, camera: Camera): boolean {
  const { x, y, z } = camera.position;
  return entity.upX * x + entity.upY * y + entity.upZ * z > 1;
}
