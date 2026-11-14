import { create } from "zustand";
import type { SatelliteRecord } from "@/features/satellites/domain/satellite";
import type { Pass } from "../domain/passes";
import type { Observer, SkyPosition } from "../domain/sky";

/**
 * "off" until the user asks; "denied" when they refuse to share their
 * position; "unavailable" when the device cannot tell where it is.
 */
export type OverheadStatus = "off" | "locating" | "on" | "denied" | "unavailable";

export interface SatelliteAbove {
  readonly satellite: SatelliteRecord;
  readonly sky: SkyPosition;
  readonly altitudeKm: number;
}

export interface StationPass {
  readonly satellite: SatelliteRecord;
  readonly pass: Pass;
}

interface OverheadStore {
  readonly status: OverheadStatus;
  /** Where the user stands. It never leaves the browser. */
  readonly observer: Observer | null;
  /** Satellites in the user's sky, the highest first; `null` until first counted. */
  readonly satellites: readonly SatelliteAbove[] | null;
  /** Coming passes of the space stations, the earliest first; `null` until predicted. */
  readonly passes: readonly StationPass[] | null;
  locating(): void;
  located(observer: Observer): void;
  locationFailed(reason: "denied" | "unavailable"): void;
  turnOff(): void;
  skyScanned(satellites: readonly SatelliteAbove[]): void;
  passesPredicted(passes: readonly StationPass[]): void;
}

export const useOverheadStore = create<OverheadStore>()((set) => ({
  status: "off",
  observer: null,
  satellites: null,
  passes: null,
  locating: () => set({ status: "locating" }),
  located: (observer) => set({ status: "on", observer, satellites: null, passes: null }),
  locationFailed: (reason) => set({ status: reason, observer: null }),
  turnOff: () => set({ status: "off", observer: null, satellites: null, passes: null }),
  skyScanned: (satellites) => set({ satellites }),
  passesPredicted: (passes) => set({ passes }),
}));
