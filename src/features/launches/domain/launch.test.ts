import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  launchLibraryResponseSchema,
  toLaunch,
  upcomingLaunches,
  type Launch,
} from "./launch";

const RAW = {
  id: "abc",
  name: "Vulcan VC6L | Amazon Leo (LV-01)",
  net: "2026-11-13T17:54:00Z",
  status: { abbrev: "Go", name: "Go for Launch" },
  launch_service_provider: { name: "United Launch Alliance" },
  rocket: { configuration: { name: "Vulcan VC6L" } },
  mission: { name: "Amazon Leo (LV-01)", orbit: { abbrev: "LEO" } },
  pad: {
    name: "Space Launch Complex 41",
    latitude: 28.58341025,
    longitude: "-80.58303644",
    location: { name: "Cape Canaveral SFS, FL, USA" },
  },
};

const parse = (raw: unknown): Launch | null => {
  const [first] = launchLibraryResponseSchema.parse({ results: [raw] }).results;
  return first === undefined ? null : toLaunch(first);
};

describe("toLaunch", () => {
  it("keeps what the app shows", () => {
    expect(parse(RAW)).toEqual({
      id: "abc",
      rocket: "Vulcan VC6L",
      mission: "Amazon Leo (LV-01)",
      provider: "United Launch Alliance",
      orbit: "LEO",
      status: "Go",
      statusDescription: "Go for Launch",
      liftoffTime: Date.UTC(2026, 10, 13, 17, 54) / 1000,
      pad: {
        name: "Space Launch Complex 41",
        location: "Cape Canaveral SFS, FL, USA",
        latitude: 28.58341025,
        longitude: -80.58303644,
      },
    });
  });

  it("falls back to the launch name and tolerates missing details", () => {
    const launch = parse({
      id: "x",
      name: "Electron | Owl New World",
      net: "2026-11-14T00:00:00Z",
    });
    expect(launch).toMatchObject({
      rocket: "Electron",
      mission: "Owl New World",
      provider: null,
      status: null,
      pad: null,
    });
  });

  it("drops launches without a date and pads without coordinates", () => {
    expect(parse({ ...RAW, net: null })).toBeNull();
    expect(parse({ ...RAW, pad: { ...RAW.pad, latitude: null } })?.pad).toBeNull();
  });
});

describe("upcomingLaunches", () => {
  const launch = (id: string, liftoffTime: number): Launch => ({
    id,
    rocket: "Rocket",
    mission: null,
    provider: null,
    orbit: null,
    status: null,
    statusDescription: null,
    liftoffTime,
    pad: null,
  });

  it("sorts by lift-off and drops launches long gone", () => {
    const now = 100_000;
    const launches = [
      launch("later", now + 500),
      launch("old", now - 8000),
      launch("just", now - 60),
    ];
    expect(upcomingLaunches(launches, now).map((l) => l.id)).toEqual(["just", "later"]);
  });
});

describe("formatCountdown", () => {
  it("counts down, then up", () => {
    expect(formatCountdown(3 * 86_400 + 4 * 3600 + 59)).toBe("T−3d 04h");
    expect(formatCountdown(2 * 3600 + 15 * 60 + 9)).toBe("T−02:15:09");
    expect(formatCountdown(0.4)).toBe("T−00:00:00");
    expect(formatCountdown(-90)).toBe("T+00:01:30");
  });
});
