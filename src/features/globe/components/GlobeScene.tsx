"use client";

import { Suspense, useState } from "react";
import { useLayersStore } from "@/features/layers/layers-store";
import { useTheme } from "@/shared/theme/use-theme";
import { AircraftSimulation } from "../lib/aircraft-simulation";
import { GLOBE_PALETTES } from "../lib/palette";
import { SatelliteSimulation } from "../lib/satellite-simulation";
import { ShipField } from "../lib/ship-field";
import { AircraftLayer } from "./AircraftLayer";
import { AircraftMarkers } from "./AircraftMarkers";
import { AircraftPicker } from "./AircraftPicker";
import { CameraRig } from "./CameraRig";
import { CountryLabels } from "./CountryLabels";
import { Earth } from "./Earth";
import { EmergencyMarkers } from "./EmergencyMarkers";
import { FlightPathLayer } from "./FlightPathLayer";
import { LaunchMarkers } from "./LaunchMarkers";
import { SatelliteLayer } from "./SatelliteLayer";
import { SatelliteMarkers } from "./SatelliteMarkers";
import { SatellitePicker } from "./SatellitePicker";
import { ShipLayer } from "./ShipLayer";
import { ShipMarkers } from "./ShipMarkers";
import { ShipPicker } from "./ShipPicker";

export function GlobeScene() {
  const [simulation] = useState(() => new AircraftSimulation());
  const [satellites] = useState(() => new SatelliteSimulation());
  const [ships] = useState(() => new ShipField());
  const layers = useLayersStore((state) => state.visible);
  const palette = GLOBE_PALETTES[useTheme()];

  return (
    <>
      <Suspense fallback={null}>
        <Earth palette={palette} />
      </Suspense>
      <Suspense fallback={null}>
        <CountryLabels />
      </Suspense>
      {/* Order matters: each layer advances the simulation that the components after it read. */}
      <AircraftLayer simulation={simulation} palette={palette} />
      <FlightPathLayer simulation={simulation} palette={palette} />
      <AircraftMarkers simulation={simulation} palette={palette} />
      <EmergencyMarkers simulation={simulation} palette={palette} />
      <AircraftPicker simulation={simulation} />
      {layers.satellites && (
        <>
          <SatelliteLayer simulation={satellites} palette={palette} />
          <SatelliteMarkers simulation={satellites} palette={palette} />
          {/* After the aircraft picker, which gets the first say on every click. */}
          <SatellitePicker simulation={satellites} />
        </>
      )}
      {layers.ships && (
        <>
          <ShipLayer field={ships} palette={palette} />
          <ShipMarkers field={ships} palette={palette} />
          {/*
            Last say on every click. Handlers run in the order they were added, so
            this picker is mounted again whenever the satellite picker appears.
          */}
          <ShipPicker key={layers.satellites ? "after-satellites" : "alone"} field={ships} />
        </>
      )}
      {layers.launches && <LaunchMarkers palette={palette} />}
      <CameraRig simulation={simulation} />
    </>
  );
}
