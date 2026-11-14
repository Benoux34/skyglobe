"use client";

import { useMemo } from "react";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import { useShipsStore } from "@/features/ships/store/ships-store";
import type { ShipField } from "../lib/ship-field";
import { usePointPicker, type PointPicking } from "../lib/use-point-picker";

const PICK_RADIUS_PX = 10;

interface ShipPickerProps {
  readonly field: ShipField;
}

/**
 * Screen-space picking of ships. Aircraft and satellites come first: this
 * picker must be mounted after theirs, so that its handlers run last and step
 * aside whenever one of them already took the pointer.
 */
export function ShipPicker({ field }: ShipPickerProps) {
  const picking = useMemo<PointPicking>(
    () => ({
      points: field,
      radiusPx: PICK_RADIUS_PX,
      isHoverTaken: () =>
        useFlightsStore.getState().hoveredId !== null ||
        useSatellitesStore.getState().hoveredId !== null,
      isClickTaken: () =>
        useFlightsStore.getState().selectedId !== null ||
        useSatellitesStore.getState().selectedId !== null,
      onHover: (index) => useShipsStore.getState().hover(field.shipAt(index)?.mmsi ?? null),
      onSelect: (index) => useShipsStore.getState().select(field.shipAt(index)?.mmsi ?? null),
    }),
    [field],
  );
  usePointPicker(picking);

  return null;
}
