import type { Feature } from "geojson";
import { describe, expect, it } from "vitest";
import { latLonToUnitVector } from "./coordinates";
import { countryLabel } from "./country-labels";

/** Square in d3-geo's winding order (clockwise), `size` degrees wide. */
const square = (lon: number, lat: number, size: number): number[][][] => [
  [
    [lon, lat],
    [lon, lat + size],
    [lon + size, lat + size],
    [lon + size, lat],
    [lon, lat],
  ],
];

const country = (name: string | undefined, geometry: Feature["geometry"]): Feature => ({
  type: "Feature",
  properties: name === undefined ? {} : { name },
  geometry,
});

describe("countryLabel", () => {
  it("centres the name on the country", () => {
    const label = countryLabel(
      country("Squareland", { type: "Polygon", coordinates: square(10, 0, 10) }),
    );
    const [x, y, z] = latLonToUnitVector(5, 15);

    expect(label?.name).toBe("Squareland");
    expect(label?.position[0]).toBeCloseTo(x, 2);
    expect(label?.position[1]).toBeCloseTo(y, 2);
    expect(label?.position[2]).toBeCloseTo(z, 2);
  });

  it("uses the largest landmass of a scattered country", () => {
    const mainland = countryLabel(
      country("Mainland", { type: "Polygon", coordinates: square(100, 40, 10) }),
    );
    const scattered = countryLabel(
      country("Scattered", {
        type: "MultiPolygon",
        coordinates: [square(-60, 0, 1), square(100, 40, 10), square(-170, -20, 2)],
      }),
    );

    expect(scattered?.position).toEqual(mainland?.position);
    expect(scattered?.area).toBeCloseTo(mainland?.area ?? Number.NaN, 10);
  });

  it("skips features without a name or an outline", () => {
    expect(
      countryLabel(country(undefined, { type: "Polygon", coordinates: square(0, 0, 1) })),
    ).toBeNull();
    expect(countryLabel(country("Dot", { type: "Point", coordinates: [0, 0] }))).toBeNull();
  });
});
