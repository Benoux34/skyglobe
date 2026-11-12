"use client";

import { Search, X } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { displayName, type Aircraft } from "@/features/flights/domain/aircraft";
import { aircraftColor, rgbToCss } from "@/features/flights/domain/altitude";
import { searchAircraft } from "@/features/flights/domain/search";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectAllAircraft } from "@/features/flights/store/selectors";
import { Panel } from "@/shared/ui/Panel";

const MAX_RESULTS = 7;

export function SearchBox() {
  const aircraft = useFlightsStore(selectAllAircraft);
  const selectAndFocus = useFlightsStore((state) => state.selectAndFocus);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();

  const results = useMemo(() => searchAircraft(aircraft, query, MAX_RESULTS), [aircraft, query]);
  const showResults = open && query.trim() !== "";

  const choose = (choice: Aircraft): void => {
    selectAndFocus(choice.icao24);
    setQuery(displayName(choice));
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
    <Panel className="relative z-20" aria-label="Aircraft search">
      <div className="flex items-center gap-2.5 px-3.5">
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          type="text"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search by callsign or ICAO24 address"
          placeholder="Search a flight, e.g. AFR123"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
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
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-line bg-surface p-1.5"
        >
          {results.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted">No aircraft matches “{query}”.</li>
          )}
          {results.map((result, index) => (
            <li
              key={result.icao24}
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
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: rgbToCss(aircraftColor(result)) }}
              />
              <span className="font-mono font-medium text-fg">{displayName(result)}</span>
              <span className="truncate text-muted">{result.originCountry}</span>
              <span className="ml-auto font-mono text-xs text-subtle uppercase">
                {result.icao24}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
