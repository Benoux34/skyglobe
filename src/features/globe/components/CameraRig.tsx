"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ComponentRef } from "react";
import { Vector3 } from "three";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { clamp } from "@/shared/lib/units";
import type { AircraftSimulation } from "../lib/aircraft-simulation";
import { CAMERA_MAX_DISTANCE, CAMERA_MIN_DISTANCE } from "../lib/view";

/** Fly-to animations zoom in to at most this distance. */
const FOCUS_DISTANCE = 1.9;
const FOCUS_SPEED = 3.2;
const FOCUS_DONE_ANGLE = 0.002;

interface CameraRigProps {
  readonly simulation: AircraftSimulation;
}

/** Orbit controls plus the fly-to animation triggered by `focusRequest`. */
export function CameraRig({ simulation }: CameraRigProps) {
  const focusRequest = useFlightsStore((state) => state.focusRequest);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const focusingRef = useRef<string | null>(null);

  useEffect(() => {
    focusingRef.current = focusRequest?.icao24 ?? null;
  }, [focusRequest]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (controls === null) return;
    // Any manual interaction hands control back to the user.
    const cancelFocus = (): void => {
      focusingRef.current = null;
    };
    controls.addEventListener("start", cancelFocus);
    return () => controls.removeEventListener("start", cancelFocus);
  }, []);

  useFrame(({ camera }, delta) => {
    const distance = camera.position.length();
    const controls = controlsRef.current;
    if (controls !== null) {
      // Slow down as the camera approaches the surface so dragging stays precise.
      const closeness = clamp((distance - 1) / 2, 0.03, 1);
      controls.rotateSpeed = 0.9 * closeness;
      controls.zoomSpeed = clamp(closeness * 1.6, 0.25, 1);
    }

    const entity = focusingRef.current === null ? null : simulation.find(focusingRef.current);
    if (entity === null) return;

    const target = scratch.set(entity.upX, entity.upY, entity.upZ);
    const direction = camera.position.clone().normalize();
    const blend = 1 - Math.exp(-FOCUS_SPEED * delta);
    const nextDistance = distance + (Math.min(distance, FOCUS_DISTANCE) - distance) * blend;
    const remainingAngle = direction.angleTo(target);

    direction.lerp(target, blend).normalize();
    camera.position.copy(direction).multiplyScalar(nextDistance);
    if (remainingAngle < FOCUS_DONE_ANGLE) focusingRef.current = null;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={CAMERA_MAX_DISTANCE}
    />
  );
}

const scratch = new Vector3();
