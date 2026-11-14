"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, type Group, type Vector3 } from "three";
import type { Launch, LaunchPad } from "@/features/launches/domain/launch";
import { useLaunchesStore } from "@/features/launches/store/launches-store";
import { latLonToUnitVector, SURFACE_RADIUS, type Vec3 } from "../lib/coordinates";
import type { GlobePalette } from "../lib/palette";
import { aircraftIconScale } from "../lib/view";
import { GlobeLabel } from "./GlobeLabel";

const MARKER_SCALE = 0.75;

interface PadLaunch {
  readonly launch: Launch;
  readonly pad: LaunchPad;
}

/** The soonest launch of every pad: several launches often share one. */
function soonestPerPad(launches: readonly Launch[]): PadLaunch[] {
  const byPad = new Map<string, PadLaunch>();
  for (const launch of launches) {
    if (launch.pad === null) continue;
    const key = `${launch.pad.latitude},${launch.pad.longitude}`;
    if (!byPad.has(key)) byPad.set(key, { launch, pad: launch.pad });
  }
  return [...byPad.values()];
}

interface LaunchMarkersProps {
  readonly palette: GlobePalette;
}

/** Marks the pads of the upcoming launches; the next one and the selected one are named. */
export function LaunchMarkers({ palette }: LaunchMarkersProps) {
  const launches = useLaunchesStore((state) => state.launches);
  const selectedId = useLaunchesStore((state) => state.selectedId);

  const pads = useMemo(() => soonestPerPad(launches), [launches]);
  const next = pads[0];
  const selected = launches.find((launch) => launch.id === selectedId) ?? null;
  const selectedPad = selected?.pad ?? null;

  return (
    <>
      {pads.map(({ launch, pad }) => (
        <PadMarker key={launch.id} pad={pad} color={palette.launch} />
      ))}
      {selected !== null && selectedPad !== null && (
        <PadLabel text={selected.rocket} pad={selectedPad} emphasized />
      )}
      {next !== undefined && next.launch.id !== selected?.id && (
        <PadLabel text={next.launch.rocket} pad={next.pad} />
      )}
    </>
  );
}

const padPosition = (pad: LaunchPad): Vec3 => {
  const [x, y, z] = latLonToUnitVector(pad.latitude, pad.longitude);
  return [x * SURFACE_RADIUS, y * SURFACE_RADIUS, z * SURFACE_RADIUS];
};

function PadMarker({ pad, color }: { readonly pad: LaunchPad; readonly color: string }) {
  const markerRef = useRef<Group>(null);
  const position = useMemo(() => padPosition(pad), [pad]);

  useFrame(({ camera }) => {
    const marker = markerRef.current;
    if (marker === null) return;
    marker.scale.setScalar(aircraftIconScale(camera.position.length()) * MARKER_SCALE);
    marker.lookAt(0, 0, 0);
  });

  return (
    <group ref={markerRef} position={position}>
      <mesh>
        <circleGeometry args={[0.45, 20]} />
        <meshBasicMaterial color={color} side={DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color={color} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface PadLabelProps {
  readonly text: string;
  readonly pad: LaunchPad;
  readonly emphasized?: boolean;
}

function PadLabel({ text, pad, emphasized = false }: PadLabelProps) {
  const position = useMemo(() => padPosition(pad), [pad]);
  const locate = (target: Vector3): boolean => {
    target.set(...position);
    return true;
  };
  return <GlobeLabel text={text} tone={emphasized ? "emphasized" : "default"} locate={locate} />;
}
