import { describe, expect, it } from "vitest";
import {
  createOrbit,
  inclinationDegrees,
  orbitalPeriodMinutes,
  orbitPathAt,
  orbitRegime,
  orbitShape,
  satelliteStateAt,
} from "./orbit";
import {
  buildCatalog,
  countByGroup,
  elementsEpoch,
  internationalDesignator,
  launchYear,
  parseTle,
} from "./satellite";

const ISS = [
  "ISS (ZARYA)             ",
  "1 25544U 98067A   26316.43260916  .00008000  00000+0  15000-3 0  9990",
  "2 25544  51.6324 286.4897 0007327  17.4200 100.0000 15.50000000500000",
];
const STARLINK = [
  "STARLINK-1008           ",
  "1 44714U 19074B   26316.50000000  .00001000  00000+0  80000-4 0  9990",
  "2 44714  53.0540 100.0000 0001500  90.0000 270.0000 15.06400000300000",
];
const GPS = [
  "NAVSTAR 72 (USA 258)    ",
  "1 40105U 14045A   26316.50000000  .00000010  00000+0  00000+0 0  9990",
  "2 40105  55.5000 120.0000 0040000  50.0000 310.0000  2.00560000 90000",
];
const WEATHER = [
  "NOAA 19                 ",
  "1 33591U 09005A   26316.50000000  .00000100  00000+0  80000-4 0  9990",
  "2 33591  99.0000 200.0000 0014000 120.0000 240.0000 14.13000000900000",
];

const tle = (...satellites: readonly string[][]): string => satellites.flat().join("\r\n");
const EPOCH = new Date(Date.UTC(2026, 10, 12, 12));

describe("parseTle", () => {
  it("reads names and catalogue numbers", () => {
    expect(parseTle(tle(ISS, STARLINK)).map((entry) => [entry.id, entry.name])).toEqual([
      [25544, "ISS (ZARYA)"],
      [44714, "STARLINK-1008"],
    ]);
  });

  it("skips incomplete groups", () => {
    const broken = ["ORPHAN NAME", ...ISS, "1 99999U truncated"].join("\n");
    expect(parseTle(broken).map((entry) => entry.id)).toEqual([25544]);
  });
});

describe("buildCatalog", () => {
  it("sorts satellites into groups and renames the stations", () => {
    const catalog = buildCatalog(tle(ISS, STARLINK, GPS, WEATHER), tle(GPS));

    expect(catalog.map((record) => [record.name, record.group])).toEqual([
      ["ISS", "station"],
      ["STARLINK-1008", "starlink"],
      ["NAVSTAR 72 (USA 258)", "navigation"],
      ["NOAA 19", "other"],
    ]);
    expect(countByGroup(catalog)).toEqual({ station: 1, starlink: 1, navigation: 1, other: 1 });
  });
});

describe("orbit", () => {
  const [, line1 = "", line2 = ""] = ISS;
  const orbit = createOrbit({ line1, line2 });

  it("places the ISS in low Earth orbit", () => {
    expect(orbit).not.toBeNull();
    if (orbit === null) return;
    const state = satelliteStateAt(orbit, EPOCH);

    expect(state?.altitudeKm).toBeGreaterThan(380);
    expect(state?.altitudeKm).toBeLessThan(440);
    expect(state?.speedKmS).toBeCloseTo(7.66, 1);
    expect(Math.abs(state?.latitude ?? 90)).toBeLessThanOrEqual(51.7);
    expect(orbitalPeriodMinutes(orbit)).toBeCloseTo(92.9, 0);
    expect(inclinationDegrees(orbit)).toBeCloseTo(51.63, 1);
  });

  it("draws one revolution centred on the satellite", () => {
    if (orbit === null) return;
    const path = orbitPathAt(orbit, EPOCH, 64);
    const [first, middle, last] = [path[0], path[32], path.at(-1)];
    const current = satelliteStateAt(orbit, EPOCH)?.position;
    const distance = (a: { x: number; y: number; z: number }, b: typeof a): number =>
      Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

    expect(path).toHaveLength(65);
    if (first === undefined || middle === undefined || last === undefined) {
      throw new Error("the path is incomplete");
    }
    if (current === undefined) throw new Error("the satellite could not be placed");

    // The satellite sits on the middle of the line...
    expect(distance(middle, current)).toBeLessThan(0.001);
    // ...and the seam, where the two ends nearly meet, is on the opposite side of the Earth.
    expect(distance(first, last)).toBeLessThan(60);
    expect(distance(first, current)).toBeGreaterThan(13_000);
  });

  it("describes the shape of the orbit", () => {
    if (orbit === null) return;
    const shape = orbitShape(orbit);

    expect(shape.perigeeKm).toBeGreaterThan(400);
    expect(shape.apogeeKm).toBeLessThan(430);
    expect(shape.apogeeKm).toBeGreaterThan(shape.perigeeKm);
    expect(shape.revolutionsPerDay).toBeCloseTo(15.5, 1);
    expect(orbitRegime(orbit)).toBe("Low Earth orbit");

    const [, gpsLine1 = "", gpsLine2 = ""] = GPS;
    const gps = createOrbit({ line1: gpsLine1, line2: gpsLine2 });
    expect(gps === null ? null : orbitRegime(gps)).toBe("Medium Earth orbit");
  });

  it("reads the launch and the date of the elements from line 1", () => {
    expect(internationalDesignator(line1)).toBe("1998-067A");
    expect(launchYear(line1)).toBe(1998);
    // Day 316.43 of 2026 is 12 November, mid-morning.
    expect(elementsEpoch(line1)?.toISOString().slice(0, 13)).toBe("2026-11-12T10");
    expect(internationalDesignator("1 garbage")).toBeNull();
  });

  it("rejects unusable element sets", () => {
    expect(createOrbit({ line1: "1 garbage", line2: "2 garbage" })).toBeNull();
  });
});
