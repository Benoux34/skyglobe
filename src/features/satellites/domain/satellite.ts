export type SatelliteGroup = "station" | "starlink" | "navigation" | "other";

export interface SatelliteGroupInfo {
  readonly id: SatelliteGroup;
  readonly label: string;
}

export const SATELLITE_GROUPS: readonly SatelliteGroupInfo[] = [
  { id: "station", label: "Space stations" },
  { id: "starlink", label: "Starlink" },
  { id: "navigation", label: "Navigation" },
  { id: "other", label: "Other" },
];

export function satelliteGroupLabel(group: SatelliteGroup): string {
  return SATELLITE_GROUPS.find((info) => info.id === group)?.label ?? group;
}

/** One satellite of the catalogue, with the two-line element set describing its orbit. */
export interface SatelliteRecord {
  /** NORAD catalogue number. */
  readonly id: number;
  readonly name: string;
  readonly group: SatelliteGroup;
  readonly line1: string;
  readonly line2: string;
}

export type SatelliteId = SatelliteRecord["id"];

interface TleEntry {
  readonly id: number;
  readonly name: string;
  readonly line1: string;
  readonly line2: string;
}

/** Crewed stations, by catalogue number, with the name people actually use. */
const STATIONS: ReadonlyMap<number, string> = new Map([
  [25544, "ISS"],
  [48274, "Tiangong"],
]);

/**
 * Reads the three-line format (name, line 1, line 2) published by CelesTrak.
 * Malformed groups are skipped rather than failing the whole catalogue.
 */
export function parseTle(text: string): TleEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line !== "");

  const entries: TleEntry[] = [];
  let index = 0;
  while (index + 2 < lines.length) {
    const [name, line1, line2] = [lines[index], lines[index + 1], lines[index + 2]];
    if (
      name === undefined ||
      line1 === undefined ||
      line2 === undefined ||
      !line1.startsWith("1 ") ||
      !line2.startsWith("2 ")
    ) {
      index += 1;
      continue;
    }
    index += 3;

    const id = Number(line1.slice(2, 7));
    if (Number.isInteger(id)) entries.push({ id, name: name.trim(), line1, line2 });
  }
  return entries;
}

function classify(entry: TleEntry, navigationIds: ReadonlySet<number>): SatelliteGroup {
  if (STATIONS.has(entry.id)) return "station";
  if (entry.name.startsWith("STARLINK")) return "starlink";
  if (navigationIds.has(entry.id)) return "navigation";
  return "other";
}

/**
 * Builds the catalogue from the list of active satellites. `navigationTle` is
 * the list of positioning satellites (GPS, Galileo, GLONASS, BeiDou…), whose
 * names alone do not tell them apart.
 */
export function buildCatalog(activeTle: string, navigationTle: string): SatelliteRecord[] {
  const navigationIds = new Set(parseTle(navigationTle).map((entry) => entry.id));
  return parseTle(activeTle).map((entry) => ({
    id: entry.id,
    name: STATIONS.get(entry.id) ?? entry.name,
    group: classify(entry, navigationIds),
    line1: entry.line1,
    line2: entry.line2,
  }));
}

export function countByGroup(
  catalog: readonly SatelliteRecord[],
): Readonly<Record<SatelliteGroup, number>> {
  const counts: Record<SatelliteGroup, number> = {
    station: 0,
    starlink: 0,
    navigation: 0,
    other: 0,
  };
  for (const record of catalog) counts[record.group] += 1;
  return counts;
}
