"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
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

/** Orbit controls, the fly-to animation triggered by `focusRequest`, and follow mode. */
export function CameraRig({ simulation }: CameraRigProps) {
  const focusRequest = useFlightsStore((state) => state.focusRequest);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const focusingRef = useRef<string | null>(null);
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    focusingRef.current = focusRequest?.icao24 ?? null;
  }, [focusRequest]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (controls === null) return;
    // Any manual interaction (drag or wheel) ends the fly-to animation.
    const cancelFocus = (): void => {
      focusingRef.current = null;
    };
    // Dragging the globe also ends follow mode; zooming with the wheel does not.
    const stopFollowing = (): void => useFlightsStore.getState().stopFollowing();

    controls.addEventListener("start", cancelFocus);
    canvas.addEventListener("pointerdown", stopFollowing);
    return () => {
      controls.removeEventListener("start", cancelFocus);
      canvas.removeEventListener("pointerdown", stopFollowing);
    };
  }, [canvas]);

  useFrame(({ camera }, delta) => {
    const distance = camera.position.length();
    const controls = controlsRef.current;
    if (controls !== null) {
      // Slow down as the camera approaches the surface so dragging stays precise.
      const closeness = clamp((distance - 1) / 2, 0.03, 1);
      controls.rotateSpeed = 0.9 * closeness;
      controls.zoomSpeed = clamp(closeness * 1.6, 0.25, 1);
    }

    // A fly-to takes precedence; once it lands, follow mode keeps tracking.
    const flyingTo = focusingRef.current;
    const targetId = flyingTo ?? useFlightsStore.getState().followingId;
    const entity = targetId === null ? null : simulation.find(targetId);
    if (entity === null) return;

    const target = scratch.set(entity.upX, entity.upY, entity.upZ);
    const direction = camera.position.clone().normalize();
    const blend = 1 - Math.exp(-FOCUS_SPEED * delta);
    // Only a fly-to zooms in; while following, the zoom level is the user's.
    const nextDistance =
      flyingTo === null
        ? distance
        : distance + (Math.min(distance, FOCUS_DISTANCE) - distance) * blend;
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
