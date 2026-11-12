import { describe, expect, it } from "vitest";
import type { Aircraft } from "./aircraft";
import { countActiveFilters, DEFAULT_FILTERS, matchesFilters } from "./filters";
import { searchAircraft } from "./search";
import { computeStats } from "./stats";

const aircraft = (overrides: Partial<Aircraft> = {}): Aircraft => ({
  icao24: "abc123",
  callsign: "AFR123",
  originCountry: "France",
  longitude: 2,
  latitude: 48,
  altitude: 10_668, // 35,000 ft
  onGround: false,
  velocity: 231.5, // 450 kt
  track: 90,
  verticalRate: 0,
  positionTime: 0,
  squawk: null,
  ...overrides,
});

describe("matchesFilters", () => {
  it("hides parked aircraft by default and shows airborne ones", () => {
    expect(matchesFilters(aircraft(), DEFAULT_FILTERS)).toBe(true);
    expect(matchesFilters(aircraft({ onGround: true }), DEFAULT_FILTERS)).toBe(false);
  });

  it("filters by altitude, speed and country", () => {
    const low = { ...DEFAULT_FILTERS, altitudeFeet: { min: 0, max: 20_000 } };
    const fast = { ...DEFAULT_FILTERS, speedKnots: { min: 500, max: 600 } };
    const spain = { ...DEFAULT_FILTERS, country: "Spain" };

    expect(matchesFilters(aircraft(), low)).toBe(false);
    expect(matchesFilters(aircraft(), fast)).toBe(false);
    expect(matchesFilters(aircraft(), spain)).toBe(false);
    expect(matchesFilters(aircraft({ originCountry: "Spain" }), spain)).toBe(true);
  });

  it("treats the slider maximum as open-ended", () => {
    expect(matchesFilters(aircraft({ altitude: 20_000, velocity: 500 }), DEFAULT_FILTERS)).toBe(
      true,
    );
  });

  it("counts filters that differ from the defaults", () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(
      countActiveFilters({ ...DEFAULT_FILTERS, country: "Spain", includeOnGround: true }),
    ).toBe(2);
  });
});

describe("searchAircraft", () => {
  const fleet = [
    aircraft({ icao24: "111111", callsign: "BAW12" }),
    aircraft({ icao24: "222222", callsign: "AFR123" }),
    aircraft({ icao24: "afr000", callsign: null }),
    aircraft({ icao24: "333333", callsign: "XAFR1" }),
  ];

  it("ranks callsign prefixes, then ICAO prefixes, then substrings", () => {
    expect(searchAircraft(fleet, "afr", 10).map((a) => a.icao24)).toEqual([
      "222222",
      "afr000",
      "333333",
    ]);
  });

  it("returns nothing for a blank query", () => {
    expect(searchAircraft(fleet, "  ", 10)).toEqual([]);
  });
});

describe("computeStats", () => {
  it("summarises a fleet", () => {
    const stats = computeStats([
      aircraft(),
      aircraft({ originCountry: "Spain", altitude: 1_000 }),
      aircraft({ onGround: true, velocity: 0 }),
    ]);

    expect(stats).toMatchObject({ total: 3, airborne: 2, onGround: 1, meanAirborneSpeed: 231.5 });
    expect(stats.countries[0]).toEqual({ country: "France", count: 2 });
    expect(stats.altitudeBands.map((b) => b.count)).toEqual([1, 0, 0, 1, 0]);
  });
});
