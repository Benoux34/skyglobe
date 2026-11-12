"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ComponentRef } from "react";
import { DoubleSide, type Group, type Vector3 } from "three";
import { airportCode, type Airport } from "@/features/flights/domain/flight-details";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectSelectedFlightDetails } from "@/features/flights/store/selectors";
import type { AircraftSimulation } from "../lib/aircraft-simulation";
import type { Vec3 } from "../lib/coordinates";
import { airportPosition, trackPositions, writeArc } from "../lib/flight-path-geometry";
import type { GlobePalette } from "../lib/palette";
import { aircraftIconScale } from "../lib/view";
import { GlobeLabel } from "./GlobeLabel";

const ARC_POINTS = 65;
const TAIL_POINTS = 9;
/** The aircraft moves slowly on screen; refreshing the lines 4 times a second is plenty. */
const REFRESH_SECONDS = 0.25;
/** Lines are created with their final point count, then filled in on the next refresh. */
const placeholder = (points: number): Vec3[] => Array.from({ length: points }, () => [0, 0, 0]);
const TAIL_PLACEHOLDER = placeholder(TAIL_POINTS);
const ARC_PLACEHOLDER = placeholder(ARC_POINTS);

type LineHandle = ComponentRef<typeof Line>;

interface FlightPathLayerProps {
  readonly simulation: AircraftSimulation;
  readonly palette: GlobePalette;
}

/**
 * Path of the selected aircraft: the track flown so far (solid), the remaining
 * great circle to its destination (dashed) and both airports.
 */
export function FlightPathLayer({ simulation, palette }: FlightPathLayerProps) {
  const selectedId = useFlightsStore((state) => state.selectedId);
  const details = useFlightsStore(selectSelectedFlightDetails);
  const tailRef = useRef<LineHandle>(null);
  const remainingRef = useRef<LineHandle>(null);
  const sinceRefresh = useRef(Number.POSITIVE_INFINITY);

  const flown = useMemo(() => (details?.track ? trackPositions(details.track) : []), [details]);
  const lastFlown = flown.at(-1);
  const destination = useMemo(
    () => (details?.route ? airportPosition(details.route.destination) : null),
    [details],
  );
  const buffers = useMemo(
    () => ({
      tail: new Float32Array(TAIL_POINTS * 3),
      remaining: new Float32Array(ARC_POINTS * 3),
    }),
    [],
  );

  useFrame((_, delta) => {
    sinceRefresh.current += delta;
    if (sinceRefresh.current < REFRESH_SECONDS) return;
    sinceRefresh.current = 0;

    const entity = selectedId === null ? null : simulation.find(selectedId);
    if (entity === null) return;
    const aircraft: Vec3 = [
      entity.upX * entity.radius,
      entity.upY * entity.radius,
      entity.upZ * entity.radius,
    ];

    // Bridges the gap between the last reported waypoint and the estimated position.
    if (tailRef.current !== null && lastFlown !== undefined) {
      writeArc(buffers.tail, lastFlown, aircraft);
      tailRef.current.geometry.setPositions(buffers.tail);
    }
    if (remainingRef.current !== null && destination !== null) {
      writeArc(buffers.remaining, aircraft, destination);
      remainingRef.current.geometry.setPositions(buffers.remaining);
      remainingRef.current.computeLineDistances();
    }
  });

  if (details === null) return null;

  return (
    // Keyed by aircraft so line buffers never carry over from the previous selection.
    <group key={selectedId ?? "none"}>
      {flown.length >= 2 && (
        <Line points={flown} color={palette.ink} lineWidth={1.6} toneMapped={false} />
      )}
      {lastFlown !== undefined && (
        <Line
          ref={tailRef}
          points={TAIL_PLACEHOLDER}
          color={palette.ink}
          lineWidth={1.6}
          toneMapped={false}
        />
      )}
      {destination !== null && (
        <Line
          ref={remainingRef}
          points={ARC_PLACEHOLDER}
          color={palette.ink}
          lineWidth={1.2}
          dashed
          dashSize={0.012}
          gapSize={0.012}
          transparent
          opacity={0.55}
          toneMapped={false}
        />
      )}
      {details.route !== null && (
        <>
          <AirportMarker airport={details.route.origin} color={palette.ink} />
          <AirportMarker airport={details.route.destination} color={palette.ink} />
        </>
      )}
    </group>
  );
}

interface AirportMarkerProps {
  readonly airport: Airport;
  readonly color: string;
}

function AirportMarker({ airport, color }: AirportMarkerProps) {
  const dotRef = useRef<Group>(null);
  const position = useMemo(() => airportPosition(airport), [airport]);

  useFrame(({ camera }) => {
    const dot = dotRef.current;
    if (dot === null) return;
    dot.scale.setScalar(aircraftIconScale(camera.position.length()) * 0.55);
    dot.lookAt(0, 0, 0);
  });

  const locate = (target: Vector3): boolean => {
    target.set(...position);
    return true;
  };

  return (
    <>
      <group ref={dotRef} position={position}>
        <mesh>
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color={color} side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      <GlobeLabel text={airportCode(airport)} locate={locate} />
    </>
  );
}
