"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ComponentRef } from "react";
import { DoubleSide, type Group } from "three";
import { createOrbit, orbitPathAt } from "@/features/satellites/domain/orbit";
import {
  selectHoveredSatellite,
  selectSelectedSatellite,
  useSatellitesStore,
} from "@/features/satellites/store/satellites-store";
import type { Vec3 } from "../lib/coordinates";
import type { GlobePalette } from "../lib/palette";
import {
  earthFixedToScene,
  satelliteLocator,
  type SatelliteSimulation,
} from "../lib/satellite-simulation";
import { GlobeLabel } from "./GlobeLabel";

const ORBIT_SEGMENTS = 180;
/** The Earth turns under the orbit, so its drawing is realigned now and then. */
const ORBIT_REFRESH_SECONDS = 2;
/** Ring radius as a fraction of its distance to the camera: a constant size on screen. */
const RING_SCREEN_SIZE = 0.016;
const ORBIT_PLACEHOLDER: Vec3[] = Array.from({ length: ORBIT_SEGMENTS + 1 }, () => [0, 0, 0]);

interface SatelliteMarkersProps {
  readonly simulation: SatelliteSimulation;
  readonly palette: GlobePalette;
}

/** Ring, orbit and name of the selected satellite, plus name tags for hover and the stations. */
export function SatelliteMarkers({ simulation, palette }: SatelliteMarkersProps) {
  const selected = useSatellitesStore(selectSelectedSatellite);
  const hovered = useSatellitesStore(selectHoveredSatellite);
  const catalog = useSatellitesStore((state) => state.catalog);
  const ringRef = useRef<Group>(null);
  const orbitRef = useRef<ComponentRef<typeof Line>>(null);
  const sinceOrbitRefresh = useRef(Number.POSITIVE_INFINITY);

  // Crewed stations are few and worth finding at a glance: they are always named.
  const stations = useMemo(() => catalog.filter((record) => record.group === "station"), [catalog]);
  const orbit = useMemo(() => (selected === null ? null : createOrbit(selected)), [selected]);
  const orbitBuffer = useMemo(() => new Float32Array((ORBIT_SEGMENTS + 1) * 3), []);

  useFrame(({ camera }, delta) => {
    const ring = ringRef.current;
    if (ring !== null) {
      ring.visible = selected !== null && satelliteLocator(simulation, selected.id)(ring.position);
      if (ring.visible) {
        ring.scale.setScalar(camera.position.distanceTo(ring.position) * RING_SCREEN_SIZE);
        ring.quaternion.copy(camera.quaternion);
      }
    }

    sinceOrbitRefresh.current += delta;
    const line = orbitRef.current;
    if (line === null || orbit === null || sinceOrbitRefresh.current < ORBIT_REFRESH_SECONDS) {
      return;
    }
    const path = orbitPathAt(orbit, new Date(), ORBIT_SEGMENTS);
    // A satellite about to decay cannot be propagated over a whole revolution.
    if (path.length !== ORBIT_SEGMENTS + 1) return;
    sinceOrbitRefresh.current = 0;
    path.forEach((position, index) => orbitBuffer.set(earthFixedToScene(position), index * 3));
    line.geometry.setPositions(orbitBuffer);
  });

  return (
    <>
      <group ref={ringRef} visible={false}>
        <mesh>
          <ringGeometry args={[0.8, 1, 48]} />
          <meshBasicMaterial color={palette.ink} side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>

      {selected !== null && orbit !== null && (
        <Line
          // Keyed by satellite so the buffer never shows the previous orbit.
          key={selected.id}
          ref={(line) => {
            orbitRef.current = line;
            sinceOrbitRefresh.current = Number.POSITIVE_INFINITY;
          }}
          points={ORBIT_PLACEHOLDER}
          color={palette.ink}
          lineWidth={1.3}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      )}

      {selected !== null && (
        <GlobeLabel
          text={selected.name}
          tone="emphasized"
          locate={satelliteLocator(simulation, selected.id)}
        />
      )}
      {hovered !== null && hovered.id !== selected?.id && (
        <GlobeLabel text={hovered.name} locate={satelliteLocator(simulation, hovered.id)} />
      )}
      {stations
        .filter((station) => station.id !== selected?.id && station.id !== hovered?.id)
        .map((station) => (
          <GlobeLabel
            key={station.id}
            text={station.name}
            locate={satelliteLocator(simulation, station.id)}
          />
        ))}
    </>
  );
}
