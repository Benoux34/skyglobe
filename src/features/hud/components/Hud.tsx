"use client";

import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectSelectedAircraft } from "@/features/flights/store/selectors";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { AircraftDetails } from "./AircraftDetails";
import { AltitudeLegend } from "./AltitudeLegend";
import { Brand } from "./Brand";
import { FiltersPanel } from "./FiltersPanel";
import { LoadingState } from "./LoadingState";
import { SearchBox } from "./SearchBox";
import { StatsPanel } from "./StatsPanel";
import { StatusPill } from "./StatusPill";

/** Everything drawn above the globe. Only the panels themselves capture the pointer. */
export function Hud() {
  const selected = useFlightsStore(selectSelectedAircraft);

  return (
    <div className="pointer-events-none absolute inset-0 flex justify-between gap-4 p-5">
      <LoadingState />

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
          {selected !== null && <AircraftDetails aircraft={selected} />}
          <StatsPanel />
        </div>
      </div>
    </div>
  );
}
