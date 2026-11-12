"use client";

import { ChartNoAxesColumn, SlidersHorizontal, TriangleAlert, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { Aircraft, Icao24 } from "@/features/flights/domain/aircraft";
import { countActiveFilters } from "@/features/flights/domain/filters";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectEmergencyAircraft } from "@/features/flights/store/selectors";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { Panel } from "@/shared/ui/Panel";
import { AircraftDetails } from "./AircraftDetails";
import { Brand } from "./Brand";
import { EmergencyAlerts } from "./EmergencyAlerts";
import { FiltersPanel } from "./FiltersPanel";
import { SearchBox } from "./SearchBox";
import { StatsPanel } from "./StatsPanel";
import { StatusPill } from "./StatusPill";

type Sheet = "filters" | "stats" | "alerts";

/** The open sheet, and the selection it was opened over: picking an aircraft dismisses it. */
interface OpenSheet {
  readonly sheet: Sheet;
  readonly selectedId: Icao24 | null;
}

interface MobileHudProps {
  readonly selected: Aircraft | null;
}

/** Single column for phones: search on top, one bottom sheet at a time over the globe. */
export function MobileHud({ selected }: MobileHudProps) {
  const selectedId = selected?.icao24 ?? null;
  const emergencyCount = useFlightsStore(selectEmergencyAircraft).length;
  const activeFilters = useFlightsStore((state) => countActiveFilters(state.filters));
  const [open, setOpen] = useState<OpenSheet | null>(null);

  const sheet = open !== null && open.selectedId === selectedId ? open.sheet : null;
  const toggle = (next: Sheet) => setOpen(sheet === next ? null : { sheet: next, selectedId });

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <Brand compact />
        <div className="flex min-w-0 items-center gap-2">
          <StatusPill compact />
          <ThemeToggle />
        </div>
      </div>
      <SearchBox />

      <div className="mt-auto flex max-h-[60%] min-h-0 flex-col gap-2">
        <div className="min-h-0 overflow-y-auto rounded-xl">
          {sheet === "filters" && <FiltersPanel />}
          {sheet === "stats" && <StatsPanel />}
          {sheet === "alerts" && <EmergencyAlerts />}
          {sheet === null && selected !== null && <AircraftDetails aircraft={selected} />}
        </div>

        <Panel className="flex shrink-0 gap-1 p-1.5" aria-label="Panels">
          <SheetButton
            icon={SlidersHorizontal}
            label="Filters"
            badge={activeFilters}
            active={sheet === "filters"}
            onClick={() => toggle("filters")}
          />
          <SheetButton
            icon={ChartNoAxesColumn}
            label="Stats"
            active={sheet === "stats"}
            onClick={() => toggle("stats")}
          />
          {emergencyCount > 0 && (
            <SheetButton
              icon={TriangleAlert}
              label="Alerts"
              badge={emergencyCount}
              alert
              active={sheet === "alerts"}
              onClick={() => toggle("alerts")}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

interface SheetButtonProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly badge?: number;
  readonly alert?: boolean;
  readonly active: boolean;
  readonly onClick: () => void;
}

function SheetButton({
  icon: Icon,
  label,
  badge = 0,
  alert = false,
  active,
  onClick,
}: SheetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-fg text-background" : alert ? "text-alert" : "text-fg"
      }`}
    >
      <Icon className="size-4" aria-hidden />
      {label}
      {badge > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${
            active
              ? "bg-background text-fg"
              : alert
                ? "bg-alert text-white"
                : "bg-fg text-background"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
