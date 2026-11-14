import { describe, expect, it } from "vitest";
import {
  ASCENT_DURATION_SECONDS,
  ascentAzimuth,
  ascentPath,
  ascentSeconds,
  ascentStateAt,
  currentAscent,
  REPLAY_SPEED,
} from "./ascent";
import type { Launch, LaunchPad } from "./launch";

const CAPE: LaunchPad = { name: "SLC-40", location: null, latitude: 28.56, longitude: -80.58 };
const VANDENBERG: LaunchPad = {
  name: "SLC-4E",
  location: null,
  latitude: 34.63,
  longitude: -120.61,
};
const PLESETSK: LaunchPad = { name: "43/4", location: null, latitude: 62.93, longitude: 40.46 };

const launch = (patch: Partial<Launch>): Launch => ({
  id: "l1",
  rocket: "Falcon 9 Block 5",
  mission: "Starlink Group 10-12",
  provider: "SpaceX",
  orbit: "LEO",
  status: "Go",
  statusDescription: null,
  liftoffTime: 1_000_000,
  pad: CAPE,
  ...patch,
});

describe("ascentAzimuth", () => {
  it("heads north-east for ordinary orbits and due east for the high ones", () => {
    expect(ascentAzimuth(launch({}), CAPE)).toBeCloseTo(53.6, 0);
    expect(ascentAzimuth(launch({ orbit: "GTO", mission: "SES-26" }), CAPE)).toBeCloseTo(90, 0);
    // To the space station: 51.6° of inclination.
    expect(ascentAzimuth(launch({ mission: "Crew-12" }), CAPE)).toBeCloseTo(45, 0);
  });

  it("heads towards a pole for sun-synchronous orbits", () => {
    expect(ascentAzimuth(launch({ orbit: "SSO" }), VANDENBERG)).toBeCloseTo(189, 0);
    expect(ascentAzimuth(launch({ orbit: "SSO" }), PLESETSK)).toBeCloseTo(343, 0);
  });
});

describe("ascentStateAt", () => {
  it("starts on the pad, standing still", () => {
    const state = ascentStateAt(CAPE, 90, 0);
    expect(state).toMatchObject({ altitudeKm: 0, downrangeKm: 0, speedKmh: 0 });
    expect(state.latitude).toBeCloseTo(CAPE.latitude, 6);
    expect(state.longitude).toBeCloseTo(CAPE.longitude, 6);
  });

  it("ends in low orbit at orbital speed, east of the pad", () => {
    const state = ascentStateAt(CAPE, 90, ASCENT_DURATION_SECONDS);
    expect(state.altitudeKm).toBeCloseTo(200, 0);
    expect(state.speedKmh / 3600).toBeCloseTo(7.8, 0);
    // 1,620 km due east of Florida.
    expect(state.longitude).toBeGreaterThan(-65);
    expect(state.longitude).toBeLessThan(-63);
  });

  it("climbs first and gains distance later", () => {
    const early = ascentStateAt(CAPE, 90, 60);
    expect(early.altitudeKm).toBeGreaterThan(early.downrangeKm);
    const path = ascentPath(CAPE, 90, ASCENT_DURATION_SECONDS, 10);
    expect(path).toHaveLength(11);
    expect(path.map((point) => point.altitudeKm)).toEqual(
      [...path.map((point) => point.altitudeKm)].sort((a, b) => a - b),
    );
  });
});

describe("currentAscent", () => {
  const liftoffMs = 1_000_000 * 1000;

  it("finds a launch that is climbing right now", () => {
    const launches = [launch({})];
    expect(currentAscent(launches, null, liftoffMs - 1000)).toBeNull();
    expect(currentAscent(launches, null, liftoffMs + 60_000)?.launch.id).toBe("l1");
    expect(currentAscent(launches, null, liftoffMs + 600_000)).toBeNull();
  });

  it("does not assume a launch on hold has lifted off", () => {
    expect(currentAscent([launch({ status: "Hold" })], null, liftoffMs + 60_000)).toBeNull();
  });

  it("plays a replay faster than real time, whenever the launch is planned", () => {
    const replay = { launchId: "l1", startedAtMs: 5000 };
    const ascent = currentAscent([launch({ status: "TBD" })], replay, 7000);
    expect(ascent?.replay).toBe(replay);
    expect(ascent === null ? null : ascentSeconds(ascent, 7000)).toBe(2 * REPLAY_SPEED);
    // Over once the accelerated clock passes the end of the ascent.
    expect(currentAscent([launch({ status: "TBD" })], replay, 5000 + 40_000)).toBeNull();
  });
});
