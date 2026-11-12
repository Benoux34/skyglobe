"use client";

import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import {
  ALTITUDE_FILTER_BOUNDS,
  countActiveFilters,
  SPEED_FILTER_BOUNDS,
  type NumericRange,
} from "@/features/flights/domain/filters";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectCountries } from "@/features/flights/store/selectors";
import { formatInteger } from "@/shared/lib/format";
import { Panel } from "@/shared/ui/Panel";
import { RangeSlider } from "@/shared/ui/RangeSlider";
import { Toggle } from "@/shared/ui/Toggle";

const ALL_COUNTRIES = "";

function describeRange(range: NumericRange, bounds: NumericRange, unit: string): string {
  const upper =
    range.max >= bounds.max ? `${formatInteger(bounds.max)}+` : formatInteger(range.max);
  return `${formatInteger(range.min)} – ${upper} ${unit}`;
}

export function FiltersPanel() {
  const filters = useFlightsStore((state) => state.filters);
  const updateFilters = useFlightsStore((state) => state.updateFilters);
  const resetFilters = useFlightsStore((state) => state.resetFilters);
  const countries = useFlightsStore(selectCountries);
  const [expanded, setExpanded] = useState(true);
  const activeCount = countActiveFilters(filters);

  return (
    <Panel aria-label="Filters">
      <div className="flex items-center gap-1 p-1.5">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="flex h-9 flex-1 items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium text-fg hover:bg-inset"
        >
          <SlidersHorizontal className="size-4 text-muted" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-fg px-1.5 text-xs font-semibold text-background">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={`ml-auto size-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            aria-label="Reset filters"
            title="Reset filters"
            className="grid size-9 place-items-center rounded-xl text-muted hover:bg-inset hover:text-fg"
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-5 border-t border-line px-4 pt-4 pb-4">
          <FilterField
            label="Altitude"
            value={describeRange(filters.altitudeFeet, ALTITUDE_FILTER_BOUNDS, "ft")}
          >
            <RangeSlider
              label="Altitude"
              {...ALTITUDE_FILTER_BOUNDS}
              step={1000}
              value={filters.altitudeFeet}
              onChange={(altitudeFeet) => updateFilters({ altitudeFeet })}
            />
          </FilterField>

          <FilterField
            label="Ground speed"
            value={describeRange(filters.speedKnots, SPEED_FILTER_BOUNDS, "kt")}
          >
            <RangeSlider
              label="Ground speed"
              {...SPEED_FILTER_BOUNDS}
              step={10}
              value={filters.speedKnots}
              onChange={(speedKnots) => updateFilters({ speedKnots })}
            />
          </FilterField>

          <FilterField label="Country of registration">
            <div className="relative">
              <select
                aria-label="Country of registration"
                value={filters.country ?? ALL_COUNTRIES}
                onChange={(event) =>
                  updateFilters({
                    country: event.target.value === ALL_COUNTRIES ? null : event.target.value,
                  })
                }
                className="h-9 w-full appearance-none rounded-lg border border-line bg-inset pr-8 pl-3 text-sm text-fg focus:border-fg focus:outline-none"
              >
                <option value={ALL_COUNTRIES}>All countries</option>
                {countries.map(({ country, count }) => (
                  <option key={country} value={country}>
                    {country} ({formatInteger(count)})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
            </div>
          </FilterField>

          <Toggle
            label="Show aircraft on the ground"
            checked={filters.includeOnGround}
            onChange={(includeOnGround) => updateFilters({ includeOnGround })}
          />
        </div>
      )}
    </Panel>
  );
}

interface FilterFieldProps {
  readonly label: string;
  readonly value?: string;
  readonly children: React.ReactNode;
}

function FilterField({ label, value, children }: FilterFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium tracking-wide text-muted uppercase">{label}</span>
        {value !== undefined && <span className="font-mono text-fg">{value}</span>}
      </div>
      {children}
    </div>
  );
}
