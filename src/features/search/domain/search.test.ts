import { describe, expect, it } from "vitest";
import type { Aircraft } from "@/features/flights/domain/aircraft";
import type { Launch } from "@/features/launches/domain/launch";
import type { SatelliteRecord } from "@/features/satellites/domain/satellite";
import { decodeShip } from "@/features/ships/domain/ship";
import { searchEverything, type SearchSources } from "./search";

const aircraft = (icao24: string, callsign: string | null): Aircraft => ({
  icao24,
  callsign,
  originCountry: "France",
  longitude: 2,
  latitude: 48,
  altitude: 10_000,
  onGround: false,
  velocity: 230,
  track: 90,
  verticalRate: 0,
  positionTime: 0,
  squawk: null,
});

const satellite = (id: number, name: string): SatelliteRecord => ({
  id,
  name,
  group: "other",
  line1: "",
  line2: "",
});

const ship = (mmsi: number, name: string | null, destination: string | null) =>
  decodeShip([
    mmsi,
    43,
    5,
    null,
    null,
    null,
    null,
    0,
    name,
    71,
    destination,
    300,
    null,
    null,
    null,
    null,
    null,
  ]);

const launch: Launch = {
  id: "l1",
  rocket: "Falcon 9 Block 5",
  mission: "Starlink Group 10-12",
  provider: "SpaceX",
  orbit: "LEO",
  status: "Go",
  statusDescription: null,
  liftoffTime: 0,
  pad: {
    name: "SLC-40",
    location: "Cape Canaveral SFS, FL, USA",
    latitude: 28.5,
    longitude: -80.5,
  },
};

const SOURCES: SearchSources = {
  aircraft: [aircraft("3c6444", "DLH9KC"), aircraft("39c421", "AFR123")],
  ships: [
    ship(228386800, "CMA CGM JACQUES SAADE", "LE HAVRE"),
    ship(636000001, "EVER GIVEN", "ROTTERDAM"),
    ship(227000001, null, "ROTTERDAM"),
  ],
  satellites: [satellite(25544, "ISS"), satellite(57782, "STARLINK-30376")],
  launches: [launch],
};

const titles = (query: string): string[] =>
  searchEverything(SOURCES, query, 4).flatMap((group) =>
    group.results.map((result) => {
      if (result.kind === "aircraft") return `aircraft:${result.item.callsign}`;
      if (result.kind === "ship") return `ship:${result.item.mmsi}`;
      if (result.kind === "satellite") return `satellite:${result.item.name}`;
      return `launch:${result.item.rocket}`;
    }),
  );

describe("searchEverything", () => {
  it("finds each kind of thing by its name", () => {
    expect(titles("iss")).toEqual(["satellite:ISS"]);
    expect(titles("AFR1")).toEqual(["aircraft:AFR123"]);
    expect(titles("falcon")).toEqual(["launch:Falcon 9 Block 5"]);
  });

  it("ignores spacing and punctuation", () => {
    expect(titles("cma-cgm")).toEqual(["ship:228386800"]);
    expect(titles("starlink 30376")).toEqual(["satellite:STARLINK-30376"]);
  });

  it("finds ships by the port they are heading to and by their numbers", () => {
    expect(titles("rotterdam")).toEqual(["ship:636000001", "ship:227000001"]);
    expect(titles("228386800")).toEqual(["ship:228386800"]);
  });

  it("puts the kind with the best match first", () => {
    // An exact satellite name beats a launch whose mission merely starts with the word.
    expect(titles("starlink")).toEqual(["satellite:STARLINK-30376", "launch:Falcon 9 Block 5"]);
  });

  it("only searches aircraft for a single letter, and nothing for an empty query", () => {
    expect(titles("d")).toEqual(["aircraft:DLH9KC"]);
    expect(titles("  ")).toEqual([]);
  });
});
