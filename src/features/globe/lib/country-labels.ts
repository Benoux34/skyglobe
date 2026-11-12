import { geoArea, geoCentroid } from "d3-geo";
import type { Feature, Geometry, Polygon } from "geojson";
import { feature } from "topojson-client";
import { latLonToUnitVector, type Vec3 } from "./coordinates";
import { loadWorld } from "./world-map";

export interface CountryLabel {
  readonly name: string;
  /** Where the name sits, as a point of the unit sphere. */
  readonly position: Vec3;
  /** Size of the country's main landmass in steradians; larger names show from further away. */
  readonly area: number;
}

/**
 * The largest landmass of a country. Centring the name on the whole territory
 * would drop it in the ocean for countries with far-away islands or overseas regions.
 */
function mainLandmass(geometry: Geometry): Polygon | null {
  if (geometry.type === "Polygon") return geometry;
  if (geometry.type !== "MultiPolygon") return null;

  let largest: Polygon | null = null;
  let largestArea = -1;
  for (const coordinates of geometry.coordinates) {
    const polygon: Polygon = { type: "Polygon", coordinates };
    const area = geoArea(polygon);
    if (area > largestArea) {
      largest = polygon;
      largestArea = area;
    }
  }
  return largest;
}

export function countryLabel(country: Feature): CountryLabel | null {
  const name: unknown = country.properties?.["name"];
  if (typeof name !== "string" || name === "") return null;

  const landmass = mainLandmass(country.geometry);
  if (landmass === null) return null;

  const [longitude, latitude] = geoCentroid(landmass);
  return { name, position: latLonToUnitVector(latitude, longitude), area: geoArea(landmass) };
}

async function createCountryLabels(): Promise<readonly CountryLabel[]> {
  const world = await loadWorld();
  return feature(world, world.objects.countries)
    .features.map(countryLabel)
    .filter((label) => label !== null)
    .sort((a, b) => b.area - a.area);
}

let cached: Promise<readonly CountryLabel[]> | null = null;

/** Labels sorted from the largest country to the smallest. Suitable for React's `use()`. */
export function loadCountryLabels(): Promise<readonly CountryLabel[]> {
  cached ??= createCountryLabels();
  return cached;
}
