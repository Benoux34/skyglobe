import type { GeometryCollection, Topology } from "topojson-specification";

const WORLD_URL = "/geo/countries-50m.json";

/** Natural Earth 1:50m outlines; every country carries its English `name`. */
export type WorldTopology = Topology<{
  land: GeometryCollection;
  countries: GeometryCollection<{ name?: string }>;
}>;

async function fetchWorld(): Promise<WorldTopology> {
  const response = await fetch(WORLD_URL);
  if (!response.ok) throw new Error(`Unable to load the world map (HTTP ${response.status}).`);
  return (await response.json()) as WorldTopology;
}

let cached: Promise<WorldTopology> | null = null;

/** Downloads the map once, however many layers draw from it. */
export function loadWorld(): Promise<WorldTopology> {
  cached ??= fetchWorld();
  return cached;
}
