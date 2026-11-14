import { describe, expect, it } from "vitest";
import {
  categoryOfType,
  countByCategory,
  decodeShipsSnapshot,
  navigationStatusLabel,
  shipBearing,
  shipDisplayName,
  shipsSnapshotDtoSchema,
  shipTypeLabel,
} from "./ship";

const SNAPSHOT = {
  time: 1_790_000_000,
  nextRefreshAt: 1_790_000_060,
  ships: [
    [
      228339600,
      43.2965,
      5.3698,
      182.4,
      14.2,
      181,
      0,
      1_789_999_950,
      "CMA CGM ANTOINE",
      71,
      "MARSEILLE",
      400,
    ],
    [311000123, 25.77, -80.13, null, 0, null, 5, 1_789_999_000, "OCEAN PEARL", 60, null, 290],
    [227000001, 48.38, -4.49, 90, 3.1, null, null, 1_789_999_900, null, null, null, null],
  ],
};

describe("categoryOfType", () => {
  it("groups the AIS type codes into families", () => {
    expect([30, 65, 70, 79, 84, 52, 37].map(categoryOfType)).toEqual([
      "fishing",
      "passenger",
      "cargo",
      "cargo",
      "tanker",
      "other",
      "other",
    ]);
    expect(categoryOfType(null)).toBe("other");
  });
});

describe("labels", () => {
  it("names the kind of ship and what it is doing", () => {
    expect(shipTypeLabel(52)).toBe("Tug");
    expect(shipTypeLabel(84)).toBe("Tanker");
    expect(shipTypeLabel(null)).toBe("Ship");
    expect(navigationStatusLabel(5)).toBe("Moored");
    expect(navigationStatusLabel(null)).toBeNull();
  });
});

describe("decodeShipsSnapshot", () => {
  const snapshot = decodeShipsSnapshot(shipsSnapshotDtoSchema.parse(SNAPSHOT));

  it("reads every field of a ship", () => {
    expect(snapshot.ships[0]).toEqual({
      mmsi: 228339600,
      name: "CMA CGM ANTOINE",
      latitude: 43.2965,
      longitude: 5.3698,
      course: 182.4,
      speedKnots: 14.2,
      heading: 181,
      status: 0,
      seenAt: 1_789_999_950,
      type: 71,
      category: "cargo",
      destination: "MARSEILLE",
      lengthMetres: 400,
    });
  });

  it("copes with ships that broadcast very little", () => {
    const [cargo, liner, unnamed] = snapshot.ships;
    if (cargo === undefined || liner === undefined || unnamed === undefined) {
      throw new Error("the snapshot is incomplete");
    }

    expect(shipDisplayName(unnamed)).toBe("MMSI 227000001");
    // The bow when known, otherwise the direction of travel.
    expect([cargo, liner, unnamed].map(shipBearing)).toEqual([181, null, 90]);
    expect(countByCategory(snapshot.ships)).toEqual({
      cargo: 1,
      tanker: 0,
      passenger: 1,
      fishing: 0,
      other: 1,
    });
  });

  it("rejects positions that are not on the Earth", () => {
    const offEarth = [
      228339600,
      91,
      181,
      90,
      3.1,
      null,
      null,
      1_789_999_900,
      null,
      null,
      null,
      null,
    ];
    const broken = { ...SNAPSHOT, ships: [offEarth] };
    expect(shipsSnapshotDtoSchema.safeParse(broken).success).toBe(false);
  });
});
