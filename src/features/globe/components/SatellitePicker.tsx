"use client";

import { useMemo } from "react";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import type { SatelliteSimulation } from "../lib/satellite-simulation";
import { usePointPicker, type PointPicking } from "../lib/use-point-picker";

const PICK_RADIUS_PX = 10;

interface SatellitePickerProps {
  readonly simulation: SatelliteSimulation;
}

/**
 * Screen-space picking of satellites. Aircraft come first: this picker is
 * mounted after `AircraftPicker`, so its handlers run second and step aside
 * whenever an aircraft already took the pointer.
 */
export function SatellitePicker({ simulation }: SatellitePickerProps) {
  const picking = useMemo<PointPicking>(
    () => ({
      points: simulation,
      radiusPx: PICK_RADIUS_PX,
      isHoverTaken: () => useFlightsStore.getState().hoveredId !== null,
      // The aircraft picker has just handled this click: an aircraft under the pointer wins.
      isClickTaken: () => useFlightsStore.getState().selectedId !== null,
      onHover: (index) =>
        useSatellitesStore.getState().hover(simulation.recordAt(index)?.id ?? null),
      onSelect: (index) =>
        useSatellitesStore.getState().select(simulation.recordAt(index)?.id ?? null),
    }),
    [simulation],
  );
  usePointPicker(picking);

  return null;
}
