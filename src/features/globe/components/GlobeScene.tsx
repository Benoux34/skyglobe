"use client";

import { Suspense, useState } from "react";
import { useTheme } from "@/shared/theme/use-theme";
import { AircraftSimulation } from "../lib/aircraft-simulation";
import { GLOBE_PALETTES } from "../lib/palette";
import { AircraftLayer } from "./AircraftLayer";
import { AircraftMarkers } from "./AircraftMarkers";
import { AircraftPicker } from "./AircraftPicker";
import { CameraRig } from "./CameraRig";
import { Earth } from "./Earth";
import { EmergencyMarkers } from "./EmergencyMarkers";
import { FlightPathLayer } from "./FlightPathLayer";

export function GlobeScene() {
  const [simulation] = useState(() => new AircraftSimulation());
  const palette = GLOBE_PALETTES[useTheme()];

  return (
    <>
      <Suspense fallback={null}>
        <Earth palette={palette} />
      </Suspense>
      {/* Order matters: the layer advances the simulation that the others read. */}
      <AircraftLayer simulation={simulation} palette={palette} />
      <FlightPathLayer simulation={simulation} palette={palette} />
      <AircraftMarkers simulation={simulation} palette={palette} />
      <EmergencyMarkers simulation={simulation} palette={palette} />
      <AircraftPicker simulation={simulation} />
      <CameraRig simulation={simulation} />
    </>
  );
}
