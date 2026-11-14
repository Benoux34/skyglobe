"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, type Group, type Vector3 } from "three";
import { useOverheadStore } from "@/features/overhead/store/overhead-store";
import { latLonToUnitVector, SURFACE_RADIUS, type Vec3 } from "../lib/coordinates";
import type { GlobePalette } from "../lib/palette";
import { aircraftIconScale } from "../lib/view";
import { GlobeLabel } from "./GlobeLabel";

const MARKER_SCALE = 0.7;

interface ObserverMarkerProps {
  readonly palette: GlobePalette;
}

/** Marks where the user stands while the "above me" mode is on. */
export function ObserverMarker({ palette }: ObserverMarkerProps) {
  const observer = useOverheadStore((state) => state.observer);
  const markerRef = useRef<Group>(null);

  const position = useMemo<Vec3 | null>(() => {
    if (observer === null) return null;
    const [x, y, z] = latLonToUnitVector(observer.latitude, observer.longitude);
    return [x * SURFACE_RADIUS, y * SURFACE_RADIUS, z * SURFACE_RADIUS];
  }, [observer]);

  useFrame(({ camera }) => {
    const marker = markerRef.current;
    if (marker === null) return;
    marker.scale.setScalar(aircraftIconScale(camera.position.length()) * MARKER_SCALE);
    marker.lookAt(0, 0, 0);
  });

  if (position === null) return null;
  const locate = (target: Vector3): boolean => {
    target.set(...position);
    return true;
  };

  return (
    <>
      <group ref={markerRef} position={position}>
        <mesh>
          <circleGeometry args={[0.5, 24]} />
          <meshBasicMaterial color={palette.ink} side={DoubleSide} toneMapped={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.85, 1, 32]} />
          <meshBasicMaterial color={palette.ink} side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      <GlobeLabel text="You" locate={locate} />
    </>
  );
}
