import { describe, expect, it } from "vitest";
import type { Aircraft } from "@/features/flights/domain/aircraft";
import { createOrbit } from "@/features/satellites/domain/orbit";
import { isSunlit, predictPasses, sunDirection, sunElevation } from "./passes";
import { aircraftAbove, compassPoint, lookAt } from "./sky";

const PARIS = { latitude: 48.85, longitude: 2.35 };

const aircraft = (patch: Partial<Aircraft>): Aircraft => ({
  icao24: "39c421",
  callsign: "AFR123",
  originCountry: "France",
  longitude: 2.35,
  latitude: 48.85,
  altitude: 10_000,
  onGround: false,
  velocity: 230,
  track: 90,
  verticalRate: 0,
  positionTime: 0,
  squawk: null,
  ...patch,
});

describe("lookAt", () => {
  it("finds something straight above at the zenith", () => {
    const sky = lookAt(PARIS, { ...PARIS, altitudeKm: 400 });
    expect(sky.elevation).toBeCloseTo(90, 3);
    expect(sky.rangeKm).toBeCloseTo(400, 3);
  });

  it("gives the direction to look in", () => {
    const north = lookAt(PARIS, { latitude: 50.85, longitude: 2.35, altitudeKm: 400 });
    const east = lookAt(PARIS, { latitude: 48.85, longitude: 6.35, altitudeKm: 400 });
    expect(compassPoint(north.azimuth)).toBe("N");
    expect(compassPoint(east.azimuth)).toBe("E");
    expect(north.elevation).toBeGreaterThan(50);
    expect(north.elevation).toBeLessThan(70);
  });

  it("puts the other side of the Earth below the horizon", () => {
    const sky = lookAt(PARIS, { latitude: -48.85, longitude: -177.65, altitudeKm: 400 });
    expect(sky.elevation).toBeLessThan(-80);
  });
});

describe("aircraftAbove", () => {
  it("keeps airborne aircraft high enough in the sky, the highest first", () => {
    const above = aircraftAbove(
      [
        aircraft({ icao24: "far", latitude: 45.0 }),
        aircraft({ icao24: "near", latitude: 49.0 }),
        aircraft({ icao24: "overhead" }),
        aircraft({ icao24: "parked", onGround: true }),
        aircraft({ icao24: "unknown", altitude: null }),
      ],
      PARIS,
    );
    expect(above.map((entry) => entry.aircraft.icao24)).toEqual(["overhead", "near"]);
  });
});

describe("the Sun", () => {
  it("is over the equator and the Greenwich meridian at noon on the March equinox", () => {
    const sun = sunDirection(new Date(Date.UTC(2026, 2, 20, 12)));
    expect(sunElevation({ latitude: 0, longitude: 0 }, sun)).toBeGreaterThan(87);
    expect(sunElevation({ latitude: 0, longitude: 180 }, sun)).toBeLessThan(-87);
  });

  it("stands 23.4° north of the equator at the June solstice", () => {
    const sun = sunDirection(new Date(Date.UTC(2026, 5, 21, 12)));
    expect(Math.asin(sun.z) * (180 / Math.PI)).toBeCloseTo(23.4, 0);
  });

  it("does not light a satellite behind the Earth", () => {
    const sun = { x: 1, y: 0, z: 0 };
    expect(isSunlit({ x: -6800, y: 0, z: 0 }, sun)).toBe(false);
    expect(isSunlit({ x: -6800, y: 0, z: 6800 }, sun)).toBe(true);
    expect(isSunlit({ x: 6800, y: 0, z: 0 }, sun)).toBe(true);
  });
});

describe("predictPasses", () => {
  const orbit = createOrbit({
    line1: "1 25544U 98067A   26316.43260916  .00008000  00000+0  15000-3 0  9990",
    line2: "2 25544  51.6324 286.4897 0007327  17.4200 100.0000 15.50000000500000",
  });
  const from = Date.UTC(2026, 10, 12, 12);

  it("finds the passes of the ISS over a day", () => {
    if (orbit === null) throw new Error("the orbit is unusable");
    const passes = predictPasses(orbit, PARIS, from, 24);

    // The ISS crosses a mid-latitude sky a few times a day.
    expect(passes.length).toBeGreaterThanOrEqual(2);
    expect(passes.length).toBeLessThanOrEqual(8);
    for (const pass of passes) {
      expect(pass.maxElevation).toBeGreaterThanOrEqual(10);
      expect(pass.start).toBeLessThanOrEqual(pass.peak);
      expect(pass.peak).toBeLessThanOrEqual(pass.end);
      // A pass lasts a few minutes, never more than a quarter of an hour.
      expect(pass.end - pass.start).toBeLessThan(15 * 60_000);
    }
    expect(passes.map((pass) => pass.start)).toEqual(
      [...passes.map((pass) => pass.start)].sort((a, b) => a - b),
    );
  });

  it("never passes over a place its orbit does not reach", () => {
    if (orbit === null) throw new Error("the orbit is unusable");
    expect(predictPasses(orbit, { latitude: 89, longitude: 0 }, from, 24)).toEqual([]);
  });
});
