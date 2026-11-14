import type { Aircraft } from "@/features/flights/domain/aircraft";
import { aircraftMatchScore } from "@/features/flights/domain/search";
import type { Launch } from "@/features/launches/domain/launch";
import type { SatelliteRecord } from "@/features/satellites/domain/satellite";
import type { Ship } from "@/features/ships/domain/ship";

/** Something the search found, of any of the kinds the globe shows. */
export type SearchResult =
  | { readonly kind: "aircraft"; readonly item: Aircraft }
  | { readonly kind: "ship"; readonly item: Ship }
  | { readonly kind: "satellite"; readonly item: SatelliteRecord }
  | { readonly kind: "launch"; readonly item: Launch };

export type SearchKind = SearchResult["kind"];

/** The results of one kind, best first. */
export interface SearchGroup {
  readonly kind: SearchKind;
  readonly label: string;
  readonly results: readonly SearchResult[];
}

export interface SearchSources {
  readonly aircraft: readonly Aircraft[];
  readonly ships: readonly Ship[];
  readonly satellites: readonly SatelliteRecord[];
  readonly launches: readonly Launch[];
}

const GROUP_LABELS: Readonly<Record<SearchKind, string>> = {
  aircraft: "Aircraft",
  ship: "Ships",
  satellite: "Satellites",
  launch: "Launches",
};

/** With tens of thousands of ships and satellites, one letter would match almost everything. */
const MIN_QUERY_LENGTH = 2;
/** A number buried in the middle of an identifier is only worth matching past this length. */
const MIN_LENGTH_INSIDE_SECONDARY = 4;

/** Letters and digits only: "CMA CGM", "cma-cgm" and "CMACGM" are the same query. */
export const normalizeSearchText = (text: string): string =>
  text.toUpperCase().replace(/[^A-Z0-9]/g, "");

type Field = string | number | null;

/**
 * How well `needle` matches, lower being better, or `null` for no match.
 * `names` are what people call the thing; `others` are its identifiers and
 * what it is linked to, such as the port a ship is heading to.
 */
function matchScore(
  needle: string,
  names: readonly Field[],
  others: readonly Field[],
): number | null {
  let best: number | null = null;
  const keep = (score: number): void => {
    if (best === null || score < best) best = score;
  };

  for (const field of names) {
    if (field === null) continue;
    const text = normalizeSearchText(String(field));
    if (text === needle) keep(0);
    else if (text.startsWith(needle)) keep(1);
    else if (text.includes(needle)) keep(3);
  }
  for (const field of others) {
    if (field === null) continue;
    const text = normalizeSearchText(String(field));
    if (text === needle) keep(0.5);
    else if (text.startsWith(needle)) keep(2);
    else if (needle.length >= MIN_LENGTH_INSIDE_SECONDARY && text.includes(needle)) keep(4);
  }
  return best;
}

interface Scored<T> {
  readonly item: T;
  readonly score: number;
}

function best<T>(
  items: readonly T[],
  scoreOf: (item: T) => number | null,
  limit: number,
): Scored<T>[] {
  const matches: Scored<T>[] = [];
  for (const item of items) {
    const score = scoreOf(item);
    if (score !== null) matches.push({ item, score });
  }
  return matches.sort((a, b) => a.score - b.score).slice(0, limit);
}

/**
 * Searches aircraft, ships, satellites and launches at once. Each kind gives
 * its `perKind` best matches; the kind with the best match comes first.
 */
export function searchEverything(
  sources: SearchSources,
  query: string,
  perKind: number,
): SearchGroup[] {
  const needle = normalizeSearchText(query);
  if (needle.length === 0) return [];
  const wide = needle.length >= MIN_QUERY_LENGTH;

  const groups: { group: SearchGroup; score: number }[] = [];
  const add = <T>(kind: SearchKind, found: Scored<T>[], wrap: (item: T) => SearchResult): void => {
    const [first] = found;
    if (first === undefined) return;
    groups.push({
      group: { kind, label: GROUP_LABELS[kind], results: found.map(({ item }) => wrap(item)) },
      score: first.score,
    });
  };

  add(
    "aircraft",
    best(sources.aircraft, (aircraft) => aircraftMatchScore(aircraft, needle), perKind),
    (item) => ({ kind: "aircraft", item }),
  );
  if (wide) {
    add(
      "ship",
      best(
        sources.ships,
        (ship) =>
          matchScore(needle, [ship.name], [ship.destination, ship.mmsi, ship.imo, ship.callsign]),
        perKind,
      ),
      (item) => ({ kind: "ship", item }),
    );
    add(
      "satellite",
      best(
        sources.satellites,
        (satellite) => matchScore(needle, [satellite.name], [satellite.id]),
        perKind,
      ),
      (item) => ({ kind: "satellite", item }),
    );
    add(
      "launch",
      best(
        sources.launches,
        (launch) =>
          matchScore(
            needle,
            [launch.rocket, launch.mission],
            [launch.provider, launch.pad?.location ?? null, launch.pad?.name ?? null],
          ),
        perKind,
      ),
      (item) => ({ kind: "launch", item }),
    );
  }

  return groups.sort((a, b) => a.score - b.score).map(({ group }) => group);
}
