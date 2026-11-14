"use client";

import type { Aircraft } from "@/features/flights/domain/aircraft";
import { useLayersStore } from "@/features/layers/layers-store";
import type { SatelliteRecord } from "@/features/satellites/domain/satellite";
import type { Ship } from "@/features/ships/domain/ship";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { AircraftDetails } from "./AircraftDetails";
import { AltitudeLegend } from "./AltitudeLegend";
import { Brand } from "./Brand";
import { EmergencyAlerts } from "./EmergencyAlerts";
import { FiltersPanel } from "./FiltersPanel";
import { LaunchesPanel } from "./LaunchesPanel";
import { LayersPanel } from "./LayersPanel";
import { SatelliteDetails } from "./SatelliteDetails";
import { ShipDetails } from "./ShipDetails";
import { SearchBox } from "./SearchBox";
import { StatsPanel } from "./StatsPanel";
import { StatusPill } from "./StatusPill";

interface DesktopHudProps {
  readonly aircraft: Aircraft | null;
  readonly satellite: SatelliteRecord | null;
  readonly ship: Ship | null;
}

/** Two columns framing the globe: controls on the left, live information on the right. */
export function DesktopHud({ aircraft, satellite, ship }: DesktopHudProps) {
  const launchesShown = useLayersStore((state) => state.visible.launches);

  return (
    <div className="pointer-events-none absolute inset-0 flex justify-between gap-4 p-5">
      <div className="flex max-h-full w-80 flex-col gap-3">
        <Brand />
        {/* Outside the scrolling area, which would clip its results list. */}
        <SearchBox />
        <div className="min-h-0 space-y-3 overflow-y-auto rounded-xl">
          <LayersPanel />
          <FiltersPanel />
          {launchesShown && <LaunchesPanel />}
        </div>
        <div className="mt-auto shrink-0">
          <AltitudeLegend />
        </div>
      </div>

      <div className="flex max-h-full w-80 flex-col items-end gap-3">
        <div className="flex items-center gap-2">
          <StatusPill />
          <ThemeToggle />
        </div>
        <div className="w-full min-h-0 space-y-3 overflow-y-auto rounded-xl">
          <EmergencyAlerts />
          {aircraft !== null && <AircraftDetails aircraft={aircraft} />}
          {satellite !== null && <SatelliteDetails satellite={satellite} />}
          {ship !== null && <ShipDetails ship={ship} />}
          <StatsPanel />
        </div>
      </div>
    </div>
  );
}
