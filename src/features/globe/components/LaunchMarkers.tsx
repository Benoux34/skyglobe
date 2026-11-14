"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, type Group, type Vector3 } from "three";
import { formatCountdown, type Launch, type LaunchPad } from "@/features/launches/domain/launch";
import { useLaunchesStore } from "@/features/launches/store/launches-store";
import { useNowSeconds } from "@/shared/lib/use-now";
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

/** From this long before lift-off, the pad shows the countdown next to the rocket's name. */
const COUNTDOWN_FROM_SECONDS = 24 * 3600;

/** "Falcon 9", or "Falcon 9 · T−02:15:09" on launch day. */
function labelOf(launch: Launch, now: number | null): string {
  if (now === null || launch.liftoffTime - now > COUNTDOWN_FROM_SECONDS) return launch.rocket;
  return `${launch.rocket} · ${formatCountdown(launch.liftoffTime - now)}`;
}

interface LaunchMarkersProps {
  readonly palette: GlobePalette;
}

/** Marks the pads of the upcoming launches; the next one and the selected one are named. */
export function LaunchMarkers({ palette }: LaunchMarkersProps) {
  const launches = useLaunchesStore((state) => state.launches);
  const selectedId = useLaunchesStore((state) => state.selectedId);
  const replayedId = useLaunchesStore((state) => state.replay?.launchId ?? null);
  const now = useNowSeconds();

  const pads = useMemo(() => soonestPerPad(launches), [launches]);
  const next = pads[0];
  // The launch being replayed is named by its rocket, which starts on the pad.
  const named = (launch: Launch): boolean => launch.id !== replayedId;
  const selected = launches.find((launch) => launch.id === selectedId && named(launch)) ?? null;
  const selectedPad = selected?.pad ?? null;

  return (
    <>
      {pads.map(({ launch, pad }) => (
        <PadMarker key={launch.id} pad={pad} color={palette.launch} />
      ))}
      {selected !== null && selectedPad !== null && (
        <PadLabel text={labelOf(selected, now)} pad={selectedPad} emphasized />
      )}
      {next !== undefined && next.launch.id !== selected?.id && named(next.launch) && (
        <PadLabel text={labelOf(next.launch, now)} pad={next.pad} />
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
