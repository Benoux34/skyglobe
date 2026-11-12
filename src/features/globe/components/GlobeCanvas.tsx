"use client";

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { latLonToUnitVector } from "../lib/coordinates";
import { CAMERA_INITIAL_DISTANCE, CAMERA_PORTRAIT_DISTANCE } from "../lib/view";
import { GlobeScene } from "./GlobeScene";

/** Opens above Western Europe, one of the busiest skies on Earth. */
const INITIAL_DIRECTION = latLonToUnitVector(38, 8);

/** On a portrait screen the globe is framed by its width, so the camera starts further back. */
function initialCameraPosition(): [number, number, number] {
  const portrait = window.innerWidth < window.innerHeight;
  const distance = portrait ? CAMERA_PORTRAIT_DISTANCE : CAMERA_INITIAL_DISTANCE;
  const [x, y, z] = INITIAL_DIRECTION;
  return [x * distance, y * distance, z * distance];
}

export default function GlobeCanvas() {
  const [cameraPosition] = useState(initialCameraPosition);

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 40, near: 0.01, far: 400 }}
      dpr={[1, 2]}
      // Transparent canvas: the themed page background shows through around the globe.
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <GlobeScene />
    </Canvas>
  );
}
