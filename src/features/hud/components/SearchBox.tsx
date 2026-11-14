"use client";

import { Plane, Rocket, Satellite, Search, Ship, X, type LucideIcon } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import {
  revealAircraft,
  revealLaunch,
  revealSatellite,
  revealShip,
} from "@/features/app-shell/reveal";
import { displayName } from "@/features/flights/domain/aircraft";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectAllAircraft } from "@/features/flights/store/selectors";
import { useLaunchesStore } from "@/features/launches/store/launches-store";
import { satelliteGroupLabel } from "@/features/satellites/domain/satellite";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import {
  searchEverything,
  type SearchKind,
  type SearchResult,
} from "@/features/search/domain/search";
import { shipDisplayName, shipTypeLabel } from "@/features/ships/domain/ship";
import { useShipsStore } from "@/features/ships/store/ships-store";
import { formatDate } from "@/shared/lib/format";
import { Panel } from "@/shared/ui/Panel";

const RESULTS_PER_KIND = 4;

const ICONS: Readonly<Record<SearchKind, LucideIcon>> = {
  aircraft: Plane,
  ship: Ship,
  satellite: Satellite,
  launch: Rocket,
};

interface ResultText {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
  /** Short identifier shown on the right. */
  readonly tag: string;
}

function describe(result: SearchResult): ResultText {
  switch (result.kind) {
    case "aircraft":
      return {
        key: `aircraft:${result.item.icao24}`,
        title: displayName(result.item),
        subtitle: result.item.originCountry,
        tag: result.item.icao24,
      };
    case "ship":
      return {
        key: `ship:${result.item.mmsi}`,
        title: shipDisplayName(result.item),
        subtitle:
          result.item.destination === null
            ? shipTypeLabel(result.item.type)
            : `To ${result.item.destination}`,
        tag: String(result.item.mmsi),
      };
    case "satellite":
      return {
        key: `satellite:${result.item.id}`,
        title: result.item.name,
        subtitle: satelliteGroupLabel(result.item.group),
        tag: String(result.item.id),
      };
    case "launch":
      return {
        key: `launch:${result.item.id}`,
        title: result.item.rocket,
        subtitle: result.item.mission ?? result.item.provider ?? "Launch",
        tag: formatDate(new Date(result.item.liftoffTime * 1000)),
      };
  }
}

function reveal(result: SearchResult): void {
  switch (result.kind) {
    case "aircraft":
      return revealAircraft(result.item.icao24);
    case "ship":
      return revealShip(result.item);
    case "satellite":
      return revealSatellite(result.item);
    case "launch":
      return revealLaunch(result.item);
  }
}

/** Finds aircraft, ships, satellites and launches by name, and brings the globe to them. */
export function SearchBox() {
  const aircraft = useFlightsStore(selectAllAircraft);
  const ships = useShipsStore((state) => state.ships);
  const satellites = useSatellitesStore((state) => state.catalog);
  const launches = useLaunchesStore((state) => state.launches);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();

  const groups = useMemo(
    () => searchEverything({ aircraft, ships, satellites, launches }, query, RESULTS_PER_KIND),
    [aircraft, ships, satellites, launches, query],
  );
  const results = useMemo(() => groups.flatMap((group) => group.results), [groups]);
  const showResults = open && query.trim() !== "";

  const openSearch = (): void => {
    setOpen(true);
    // Ships and satellites are only downloaded with their layer: searching needs them too.
    useShipsStore.getState().request();
    useSatellitesStore.getState().request();
  };

  const choose = (choice: SearchResult): void => {
    reveal(choice);
    setQuery(describe(choice).title);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showResults || results.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + results.length) % results.length);
    } else if (event.key === "Enter") {
      const choice = results[activeIndex];
      if (choice !== undefined) choose(choice);
    }
  };

  return (
    <Panel className="relative z-20" aria-label="Search">
      <div className="flex items-center gap-2.5 px-3.5">
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          type="text"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search aircraft, ships, satellites and launches"
          placeholder="Search a flight, ship, satellite…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            openSearch();
          }}
          onFocus={openSearch}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-11 w-full bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
        />
        {query !== "" && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="rounded-md p-1 text-muted hover:bg-inset hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {showResults && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-surface p-1.5"
        >
          {results.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-muted">Nothing matches “{query}”.</p>
          )}
          {groups.map((group) => (
            <div key={group.kind} role="group" aria-label={group.label}>
              <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">
                {group.label}
              </p>
              {group.results.map((result) => {
                const index = results.indexOf(result);
                const text = describe(result);
                const Icon = ICONS[result.kind];
                return (
                  <div
                    key={text.key}
                    role="option"
                    aria-selected={index === activeIndex}
                    // Keep focus in the input so the blur handler does not close the list first.
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => choose(result)}
                    onPointerEnter={() => setActiveIndex(index)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                      index === activeIndex ? "bg-inset" : ""
                    }`}
                  >
                    <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                    <span className="max-w-[55%] shrink-0 truncate font-mono font-medium text-fg">
                      {text.title}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted">{text.subtitle}</span>
                    <span className="shrink-0 font-mono text-xs text-subtle uppercase">
                      {text.tag}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
