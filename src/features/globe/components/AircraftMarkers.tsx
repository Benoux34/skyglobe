"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, type Group } from "three";
import { displayName, type Icao24 } from "@/features/flights/domain/aircraft";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectHoveredAircraft, selectSelectedAircraft } from "@/features/flights/store/selectors";
import { aircraftLocator } from "../lib/aircraft-locator";
import type { AircraftSimulation } from "../lib/aircraft-simulation";
import type { GlobePalette } from "../lib/palette";
import { aircraftIconScale } from "../lib/view";
import { GlobeLabel } from "./GlobeLabel";

const RING_SCALE = 2.6;

interface AircraftMarkersProps {
  readonly simulation: AircraftSimulation;
  readonly palette: GlobePalette;
}

/** Selection ring plus callsign labels that follow the selected and hovered aircraft. */
export function AircraftMarkers({ simulation, palette }: AircraftMarkersProps) {
  const selected = useFlightsStore(selectSelectedAircraft);
  const hovered = useFlightsStore(selectHoveredAircraft);
  const ringRef = useRef<Group>(null);

  const locate = (icao24: Icao24) => aircraftLocator(simulation, icao24);

  useFrame(({ camera, clock }) => {
    const ring = ringRef.current;
    if (ring === null) return;
    ring.visible = selected !== null && locate(selected.icao24)(ring.position);
    if (!ring.visible) return;

    const pulse = 1 + 0.1 * Math.sin(clock.elapsedTime * 3);
    ring.scale.setScalar(aircraftIconScale(camera.position.length()) * RING_SCALE * pulse);
    ring.lookAt(0, 0, 0);
  });

  return (
    <>
      <group ref={ringRef} visible={false}>
        <mesh>
          <ringGeometry args={[0.86, 1, 48]} />
          <meshBasicMaterial color={palette.ink} side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      {selected !== null && (
        <GlobeLabel
          text={displayName(selected)}
          tone="emphasized"
          locate={locate(selected.icao24)}
        />
      )}
      {hovered !== null && hovered.icao24 !== selected?.icao24 && (
        <GlobeLabel text={displayName(hovered)} locate={locate(hovered.icao24)} />
      )}
    </>
  );
}
