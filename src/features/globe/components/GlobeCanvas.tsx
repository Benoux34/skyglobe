"use client";

import { Canvas } from "@react-three/fiber";
import { latLonToUnitVector } from "../lib/coordinates";
import { CAMERA_INITIAL_DISTANCE } from "../lib/view";
import { GlobeScene } from "./GlobeScene";

/** Opens above Western Europe, one of the busiest skies on Earth. */
const INITIAL_CAMERA_POSITION = latLonToUnitVector(38, 8).map(
  (component) => component * CAMERA_INITIAL_DISTANCE,
) as [number, number, number];

export default function GlobeCanvas() {
  return (
    <Canvas
      camera={{ position: INITIAL_CAMERA_POSITION, fov: 40, near: 0.01, far: 400 }}
      dpr={[1, 2]}
      // Transparent canvas: the themed page background shows through around the globe.
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <GlobeScene />
    </Canvas>
  );
}
