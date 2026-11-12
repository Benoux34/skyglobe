import { describe, expect, it } from "vitest";
import type { Aircraft } from "@/features/flights/domain/aircraft";
import { AircraftSimulation } from "./aircraft-simulation";
import { EARTH_RADIUS_METRES, latLonToUnitVector } from "./coordinates";

const aircraft = (overrides: Partial<Aircraft> = {}): Aircraft => ({
  icao24: "abc123",
  callsign: "TEST1",
  originCountry: "France",
  longitude: 0,
  latitude: 0,
  altitude: 10_000,
  onGround: false,
  velocity: 250,
  track: 90,
  verticalRate: 0,
  positionTime: 1_000,
  squawk: null,
  ...overrides,
});

describe("AircraftSimulation", () => {
  it("places aircraft at their reported position at report time", () => {
    const simulation = new AircraftSimulation();
    simulation.load([aircraft({ latitude: 48.85, longitude: 2.35 })]);
    simulation.advance(1_000);

    const [entity] = simulation.entities;
    const expected = latLonToUnitVector(48.85, 2.35);
    expect(entity?.upX).toBeCloseTo(expected[0], 9);
    expect(entity?.upY).toBeCloseTo(expected[1], 9);
    expect(entity?.upZ).toBeCloseTo(expected[2], 9);
  });

  it("flies east along the equator at ground speed", () => {
    const simulation = new AircraftSimulation();
    simulation.load([aircraft()]);
    simulation.advance(1_000 + 600);

    const expectedLongitude = (((250 * 600) / EARTH_RADIUS_METRES) * 180) / Math.PI;
    const expected = latLonToUnitVector(0, expectedLongitude);
    const [entity] = simulation.entities;
    expect(entity?.upX).toBeCloseTo(expected[0], 9);
    expect(entity?.upY).toBeCloseTo(0, 9);
    expect(entity?.upZ).toBeCloseTo(expected[2], 9);
  });

  it("keeps parked aircraft still and stops extrapolating after 30 minutes", () => {
    const simulation = new AircraftSimulation();
    simulation.load([aircraft({ icao24: "ground", onGround: true }), aircraft()]);

    simulation.advance(1_000 + 1_800);
    const parked = { ...simulation.find("ground") };
    const capped = { ...simulation.find("abc123") };
    simulation.advance(1_000 + 7_200);

    expect(parked.upX).toBe(1);
    expect(simulation.find("abc123")).toMatchObject({ upX: capped.upX, upZ: capped.upZ });
  });

  it("applies visibility predicates", () => {
    const simulation = new AircraftSimulation();
    simulation.load([aircraft(), aircraft({ icao24: "other", originCountry: "Spain" })]);
    simulation.setVisibility((a) => a.originCountry === "Spain");

    expect(simulation.entities.map((e) => e.visible)).toEqual([false, true]);
  });
});
