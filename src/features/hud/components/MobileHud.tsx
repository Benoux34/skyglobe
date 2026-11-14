"use client";

import {
  ChartNoAxesColumn,
  Layers,
  SlidersHorizontal,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { Aircraft } from "@/features/flights/domain/aircraft";
import { countActiveFilters } from "@/features/flights/domain/filters";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectEmergencyAircraft } from "@/features/flights/store/selectors";
import { useLayersStore } from "@/features/layers/layers-store";
import type { SatelliteRecord } from "@/features/satellites/domain/satellite";
import type { Ship } from "@/features/ships/domain/ship";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { Panel } from "@/shared/ui/Panel";
import { AircraftDetails } from "./AircraftDetails";
import { Brand } from "./Brand";
import { EmergencyAlerts } from "./EmergencyAlerts";
import { FiltersPanel } from "./FiltersPanel";
import { LaunchesPanel } from "./LaunchesPanel";
import { LayersPanel } from "./LayersPanel";
import { OverheadPanel } from "./OverheadPanel";
import { SatelliteDetails } from "./SatelliteDetails";
import { ShipDetails } from "./ShipDetails";
import { SearchBox } from "./SearchBox";
import { StatsPanel } from "./StatsPanel";
import { StatusPill } from "./StatusPill";

type Sheet = "layers" | "filters" | "stats" | "alerts";

/** The open sheet, and the selection it was opened over: picking something dismisses it. */
interface OpenSheet {
  readonly sheet: Sheet;
  readonly selection: string | null;
}

interface MobileHudProps {
  readonly aircraft: Aircraft | null;
  readonly satellite: SatelliteRecord | null;
  readonly ship: Ship | null;
}

/** Single column for phones: search on top, one bottom sheet at a time over the globe. */
export function MobileHud({ aircraft, satellite, ship }: MobileHudProps) {
  const emergencyCount = useFlightsStore(selectEmergencyAircraft).length;
  const activeFilters = useFlightsStore((state) => countActiveFilters(state.filters));
  const launchesShown = useLayersStore((state) => state.visible.launches);
  const [open, setOpen] = useState<OpenSheet | null>(null);

  const selection =
    aircraft !== null
      ? `aircraft:${aircraft.icao24}`
      : satellite !== null
        ? `satellite:${satellite.id}`
        : ship !== null
          ? `ship:${ship.mmsi}`
          : null;
  const sheet = open !== null && open.selection === selection ? open.sheet : null;
  const toggle = (next: Sheet) => setOpen(sheet === next ? null : { sheet: next, selection });

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
        <div className="min-h-0 space-y-2 overflow-y-auto rounded-xl">
          {sheet === "layers" && (
            <>
              <LayersPanel />
              <OverheadPanel />
              {launchesShown && <LaunchesPanel />}
            </>
          )}
          {sheet === "filters" && <FiltersPanel />}
          {sheet === "stats" && <StatsPanel />}
          {sheet === "alerts" && <EmergencyAlerts />}
          {sheet === null && aircraft !== null && <AircraftDetails aircraft={aircraft} />}
          {sheet === null && satellite !== null && <SatelliteDetails satellite={satellite} />}
          {sheet === null && ship !== null && <ShipDetails ship={ship} />}
        </div>

        <Panel className="flex shrink-0 gap-1 p-1.5" aria-label="Panels">
          <SheetButton
            icon={Layers}
            label="Layers"
            active={sheet === "layers"}
            onClick={() => toggle("layers")}
          />
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
      className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors ${
        active ? "bg-fg text-background" : alert ? "text-alert" : "text-fg"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
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
