"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type ComponentRef } from "react";
import { DoubleSide, type Group, type Vector3 } from "three";
import {
  ASCENT_DURATION_SECONDS,
  ascentAzimuth,
  ascentPath,
  ascentSeconds,
  ascentStateAt,
  currentAscent,
  type Ascent,
  type AscentPoint,
} from "@/features/launches/domain/ascent";
import { formatCountdown } from "@/features/launches/domain/launch";
import { useLaunchesStore } from "@/features/launches/store/launches-store";
import { formatInteger } from "@/shared/lib/format";
import { useNowSeconds } from "@/shared/lib/use-now";
import {
  EARTH_RADIUS_METRES,
  latLonToUnitVector,
  SURFACE_RADIUS,
  type Vec3,
} from "../lib/coordinates";
import type { GlobePalette } from "../lib/palette";
import { aircraftIconScale } from "../lib/view";
import { GlobeLabel } from "./GlobeLabel";

const PATH_SEGMENTS = 96;
const ROCKET_SCALE = 0.7;

/** Altitudes are to scale, like those of the satellites the rocket is climbing towards. */
function toScene(point: AscentPoint): Vec3 {
  const radius = Math.max(SURFACE_RADIUS, 1 + (point.altitudeKm * 1000) / EARTH_RADIUS_METRES);
  const [x, y, z] = latLonToUnitVector(point.latitude, point.longitude);
  return [x * radius, y * radius, z * radius];
}

interface LaunchAscentProps {
  readonly palette: GlobePalette;
}

/**
 * Draws a rocket climbing to orbit: the launch that has just lifted off, or
 * the one whose ascent the user is replaying ahead of time.
 */
export function LaunchAscent({ palette }: LaunchAscentProps) {
  const launches = useLaunchesStore((state) => state.launches);
  const replay = useLaunchesStore((state) => state.replay);
  const now = useNowSeconds();

  // A replay runs until its own track ends it; a real launch is found by the clock.
  const replayed =
    replay === null ? undefined : launches.find((launch) => launch.id === replay.launchId);
  const ascent: Ascent | null =
    replayed !== undefined && replayed.pad !== null
      ? { launch: replayed, pad: replayed.pad, replay }
      : now === null
        ? null
        : currentAscent(launches, null, now * 1000);
  if (ascent === null) return null;
  return (
    <AscentTrack
      // A new launch or a new replay starts from the pad again.
      key={`${ascent.launch.id}:${ascent.replay?.startedAtMs ?? "live"}`}
      ascent={ascent}
      palette={palette}
    />
  );
}

interface AscentTrackProps {
  readonly ascent: Ascent;
  readonly palette: GlobePalette;
}

function AscentTrack({ ascent, palette }: AscentTrackProps) {
  const { launch, pad } = ascent;
  const rocketRef = useRef<Group>(null);
  const flownRef = useRef<ComponentRef<typeof Line>>(null);
  const [caption, setCaption] = useState("");

  const azimuth = useMemo(() => ascentAzimuth(launch, pad), [launch, pad]);
  const planned = useMemo(
    () => ascentPath(pad, azimuth, ASCENT_DURATION_SECONDS, PATH_SEGMENTS).map(toScene),
    [pad, azimuth],
  );
  const flown = useMemo(() => new Float32Array((PATH_SEGMENTS + 1) * 3), []);

  useFrame(({ camera }) => {
    const seconds = ascentSeconds(ascent, Date.now());
    if (seconds > ASCENT_DURATION_SECONDS) {
      // The replay is over; a real launch simply stops being drawn at the next tick.
      if (ascent.replay !== null) useLaunchesStore.getState().stopReplay();
      return;
    }

    ascentPath(pad, azimuth, Math.max(0, seconds), PATH_SEGMENTS).forEach((point, index) =>
      flown.set(toScene(point), index * 3),
    );
    flownRef.current?.geometry.setPositions(flown);

    const state = ascentStateAt(pad, azimuth, seconds);
    const rocket = rocketRef.current;
    if (rocket !== null) {
      rocket.position.set(...toScene(state));
      rocket.scale.setScalar(aircraftIconScale(camera.position.length()) * ROCKET_SCALE);
      rocket.quaternion.copy(camera.quaternion);
    }

    const text = `${formatCountdown(-seconds)} · ${formatInteger(state.altitudeKm)} km · ${formatInteger(state.speedKmh)} km/h`;
    setCaption((current) => (current === text ? current : text));
  });

  const locateRocket = (target: Vector3): boolean => {
    const rocket = rocketRef.current;
    if (rocket === null) return false;
    target.copy(rocket.position);
    return true;
  };

  return (
    <>
      {/* The whole climb, faint, with the part already flown drawn over it. */}
      <Line
        points={planned}
        color={palette.launch}
        lineWidth={1.2}
        transparent
        opacity={0.35}
        toneMapped={false}
      />
      <Line
        ref={flownRef}
        points={planned}
        color={palette.launch}
        lineWidth={2.4}
        toneMapped={false}
      />

      <group ref={rocketRef}>
        <mesh>
          <circleGeometry args={[0.55, 24]} />
          <meshBasicMaterial color={palette.launch} side={DoubleSide} toneMapped={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.85, 1, 32]} />
          <meshBasicMaterial color={palette.ink} side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>

      {caption !== "" && <GlobeLabel text={caption} tone="emphasized" locate={locateRocket} />}
    </>
  );
}
