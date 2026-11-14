"use client";

import { useEffect } from "react";
import { createOrbit, satelliteStateAt, type Orbit } from "@/features/satellites/domain/orbit";
import type { SatelliteRecord } from "@/features/satellites/domain/satellite";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import { predictPasses } from "../domain/passes";
import { lookAt, MIN_VISIBLE_ELEVATION, type Observer } from "../domain/sky";
import { useOverheadStore, type SatelliteAbove, type StationPass } from "../store/overhead-store";

const SCAN_INTERVAL_MS = 15_000;
/** Satellites placed between two pauses that let the page draw a frame. */
const SCAN_SLICE = 1200;
const PASSES_WINDOW_HOURS = 24;

/** Building an orbit from its elements is the costly part: each is built once. */
const orbits = new WeakMap<SatelliteRecord, Orbit | null>();

function orbitOf(record: SatelliteRecord): Orbit | null {
  let orbit = orbits.get(record);
  if (orbit === undefined) {
    orbit = createOrbit(record);
    orbits.set(record, orbit);
  }
  return orbit;
}

const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Finds the satellites in the observer's sky. The whole catalogue is far too
 * much for one frame, so it is gone through in slices. `null` when cancelled.
 */
async function scanSky(
  catalog: readonly SatelliteRecord[],
  observer: Observer,
  isCancelled: () => boolean,
): Promise<SatelliteAbove[] | null> {
  const above: SatelliteAbove[] = [];
  const now = new Date();
  for (let start = 0; start < catalog.length; start += SCAN_SLICE) {
    for (const satellite of catalog.slice(start, start + SCAN_SLICE)) {
      const orbit = orbitOf(satellite);
      const state = orbit === null ? null : satelliteStateAt(orbit, now);
      if (state === null) continue;
      const sky = lookAt(observer, state);
      if (sky.elevation >= MIN_VISIBLE_ELEVATION) {
        above.push({ satellite, sky, altitudeKm: state.altitudeKm });
      }
    }
    await pause();
    if (isCancelled()) return null;
  }
  return above.sort((a, b) => b.sky.elevation - a.sky.elevation);
}

function predictStationPasses(
  catalog: readonly SatelliteRecord[],
  observer: Observer,
): StationPass[] {
  const fromMs = Date.now();
  return catalog
    .filter((satellite) => satellite.group === "station")
    .flatMap((satellite) => {
      const orbit = orbitOf(satellite);
      return orbit === null
        ? []
        : predictPasses(orbit, observer, fromMs, PASSES_WINDOW_HOURS).map((pass) => ({
            satellite,
            pass,
          }));
    })
    .sort((a, b) => a.pass.start - b.pass.start);
}

/** While the "above me" mode is on, keeps the list of what is in the user's sky up to date. */
export function useOverheadScanner(): void {
  const observer = useOverheadStore((state) => state.observer);
  const catalog = useSatellitesStore((state) => state.catalog);

  useEffect(() => {
    if (observer === null || catalog.length === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scan = async (): Promise<void> => {
      const above = await scanSky(catalog, observer, () => cancelled);
      if (above === null) return;
      const overhead = useOverheadStore.getState();
      overhead.skyScanned(above);
      // Passes are predicted a day ahead: once per position is enough.
      if (overhead.passes === null) {
        overhead.passesPredicted(predictStationPasses(catalog, observer));
      }
      timer = setTimeout(() => void scan(), SCAN_INTERVAL_MS);
    };
    void scan();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [observer, catalog]);
}
