import { describe, expect, it } from "vitest";
import type { Aircraft } from "./aircraft";
import { emergencyOf, findEmergencies } from "./emergency";

const aircraft = (icao24: string, squawk: string | null): Aircraft => ({
  icao24,
  callsign: null,
  originCountry: "France",
  longitude: 2,
  latitude: 48,
  altitude: 10_000,
  onGround: false,
  velocity: 200,
  track: 90,
  verticalRate: 0,
  positionTime: 0,
  squawk,
});

describe("emergencyOf", () => {
  it("recognises the three distress codes", () => {
    expect(emergencyOf(aircraft("a", "7700"))?.label).toBe("General emergency");
    expect(emergencyOf(aircraft("a", "7600"))?.label).toBe("Radio failure");
    expect(emergencyOf(aircraft("a", "7500"))?.label).toBe("Unlawful interference");
  });

  it("ignores ordinary and missing codes", () => {
    expect(emergencyOf(aircraft("a", "7000"))).toBeNull();
    expect(emergencyOf(aircraft("a", "1200"))).toBeNull();
    expect(emergencyOf(aircraft("a", null))).toBeNull();
  });
});

describe("findEmergencies", () => {
  it("keeps only aircraft in distress, highest code first", () => {
    const fleet = [
      aircraft("a", "7500"),
      aircraft("b", "2000"),
      aircraft("c", "7700"),
      aircraft("d", null),
      aircraft("e", "7600"),
    ];
    expect(findEmergencies(fleet).map((a) => a.icao24)).toEqual(["c", "e", "a"]);
  });
});
