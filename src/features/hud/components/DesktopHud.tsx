"use client";

import type { Aircraft } from "@/features/flights/domain/aircraft";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { AircraftDetails } from "./AircraftDetails";
import { AltitudeLegend } from "./AltitudeLegend";
import { Brand } from "./Brand";
import { EmergencyAlerts } from "./EmergencyAlerts";
import { FiltersPanel } from "./FiltersPanel";
import { SearchBox } from "./SearchBox";
import { StatsPanel } from "./StatsPanel";
import { StatusPill } from "./StatusPill";

interface DesktopHudProps {
  readonly selected: Aircraft | null;
}

/** Two columns framing the globe: controls on the left, live information on the right. */
export function DesktopHud({ selected }: DesktopHudProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex justify-between gap-4 p-5">
      <div className="flex w-80 flex-col gap-3">
        <Brand />
        <SearchBox />
        <FiltersPanel />
        <div className="mt-auto">
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
          {selected !== null && <AircraftDetails aircraft={selected} />}
          <StatsPanel />
        </div>
      </div>
    </div>
  );
}
