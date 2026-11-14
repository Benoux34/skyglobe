import type { Camera } from "three";
import { clamp } from "@/shared/lib/units";
import type { SimulatedAircraft } from "./aircraft-simulation";

export const CAMERA_MIN_DISTANCE = 1.22;
/** Far enough to take in the navigation satellites, 20,000 km up. */
export const CAMERA_MAX_DISTANCE = 9;
export const CAMERA_INITIAL_DISTANCE = 2.9;
export const CAMERA_PORTRAIT_DISTANCE = 4.4;

/**
 * World-space size of an aircraft icon. Icons shrink as the camera approaches
 * so they stay roughly constant on screen without swallowing the map.
 */
export function aircraftIconScale(cameraDistance: number): number {
  return clamp((cameraDistance - 1) * 0.0058, 0.0009, 0.03);
}

/** Ships are drawn smaller than aircraft: there are several times more of them. */
export function shipIconScale(cameraDistance: number): number {
  return aircraftIconScale(cameraDistance) * 0.6;
}

interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * True when the Earth stands between the camera and a point, at any altitude:
 * the sight line passes through the unit sphere.
 */
export function isHiddenByEarth(x: number, y: number, z: number, camera: Point): boolean {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const dz = z - camera.z;
  // How far along the sight line its closest approach to the Earth's centre lies.
  const along = -(camera.x * dx + camera.y * dy + camera.z * dz);
  if (along <= 0) return false;

  const t = Math.min(1, along / (dx * dx + dy * dy + dz * dz));
  const closestX = camera.x + dx * t;
  const closestY = camera.y + dy * t;
  const closestZ = camera.z + dz * t;
  return closestX * closestX + closestY * closestY + closestZ * closestZ < 1;
}

/** True when the Earth does not hide the aircraft from the camera. */
export function isInFrontOfHorizon(entity: SimulatedAircraft, camera: Camera): boolean {
  const { x, y, z } = camera.position;
  return entity.upX * x + entity.upY * y + entity.upZ * z > 1;
}
