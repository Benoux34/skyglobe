"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, type Group, type MeshBasicMaterial } from "three";
import { displayName, type Aircraft } from "@/features/flights/domain/aircraft";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectEmergencyAircraft } from "@/features/flights/store/selectors";
import { aircraftLocator } from "../lib/aircraft-locator";
import type { AircraftSimulation } from "../lib/aircraft-simulation";
import type { GlobePalette } from "../lib/palette";
import { aircraftIconScale } from "../lib/view";
import { GlobeLabel } from "./GlobeLabel";

/** Seconds one ring takes to expand and fade out. */
const PING_PERIOD = 1.6;
const PING_MIN_SCALE = 1.6;
const PING_MAX_SCALE = 5.2;
const PING_OPACITY = 0.9;

interface EmergencyMarkersProps {
  readonly simulation: AircraftSimulation;
  readonly palette: GlobePalette;
}

/** Radar-style pings and tags on every aircraft squawking a distress code. */
export function EmergencyMarkers({ simulation, palette }: EmergencyMarkersProps) {
  const emergencies = useFlightsStore(selectEmergencyAircraft);
  const selectedId = useFlightsStore((state) => state.selectedId);
  const hoveredId = useFlightsStore((state) => state.hoveredId);

  return emergencies.map((aircraft) => (
    <EmergencyMarker
      key={aircraft.icao24}
      aircraft={aircraft}
      simulation={simulation}
      color={palette.alert}
      // The selection and hover tags already name the aircraft.
      labelled={aircraft.icao24 !== selectedId && aircraft.icao24 !== hoveredId}
    />
  ));
}

interface EmergencyMarkerProps {
  readonly aircraft: Aircraft;
  readonly simulation: AircraftSimulation;
  readonly color: string;
  readonly labelled: boolean;
}

function EmergencyMarker({ aircraft, simulation, color, labelled }: EmergencyMarkerProps) {
  const ringRef = useRef<Group>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const locate = aircraftLocator(simulation, aircraft.icao24);

  useFrame(({ camera, clock }) => {
    const ring = ringRef.current;
    const material = materialRef.current;
    if (ring === null || material === null) return;
    ring.visible = locate(ring.position);
    if (!ring.visible) return;

    const progress = (clock.elapsedTime % PING_PERIOD) / PING_PERIOD;
    const scale = PING_MIN_SCALE + (PING_MAX_SCALE - PING_MIN_SCALE) * progress;
    ring.scale.setScalar(aircraftIconScale(camera.position.length()) * scale);
    ring.lookAt(0, 0, 0);
    material.opacity = PING_OPACITY * (1 - progress);
  });

  return (
    <>
      <group ref={ringRef} visible={false}>
        <mesh>
          <ringGeometry args={[0.82, 1, 48]} />
          <meshBasicMaterial
            ref={materialRef}
            color={color}
            side={DoubleSide}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      {labelled && (
        <GlobeLabel
          text={`${displayName(aircraft)} · ${aircraft.squawk ?? ""}`}
          tone="alert"
          locate={locate}
        />
      )}
    </>
  );
}
