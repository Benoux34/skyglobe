import { z } from "zod";

/** Maritime Mobile Service Identity: the nine-digit number a ship broadcasts under. */
export type Mmsi = number;

export type ShipCategory = "cargo" | "tanker" | "passenger" | "fishing" | "other";

export interface ShipCategoryInfo {
  readonly id: ShipCategory;
  readonly label: string;
}

export const SHIP_CATEGORIES: readonly ShipCategoryInfo[] = [
  { id: "cargo", label: "Cargo" },
  { id: "tanker", label: "Tankers" },
  { id: "passenger", label: "Passenger" },
  { id: "fishing", label: "Fishing" },
  { id: "other", label: "Other" },
];

export interface Ship {
  readonly mmsi: Mmsi;
  readonly name: string | null;
  readonly latitude: number;
  readonly longitude: number;
  /** Direction of travel over the ground, in degrees clockwise from north. */
  readonly course: number | null;
  readonly speedKnots: number | null;
  /** Where the bow points, in degrees clockwise from north. */
  readonly heading: number | null;
  /** AIS navigational status code. */
  readonly status: number | null;
  /** Unix time (seconds) of the last position heard. */
  readonly seenAt: number;
  /** AIS ship type code. */
  readonly type: number | null;
  readonly category: ShipCategory;
  readonly destination: string | null;
  readonly lengthMetres: number | null;
}

/** Sorts the hundred AIS ship type codes into the few families shown on the globe. */
export function categoryOfType(type: number | null): ShipCategory {
  if (type === null) return "other";
  if (type === 30) return "fishing";
  if (type >= 60 && type <= 69) return "passenger";
  if (type >= 70 && type <= 79) return "cargo";
  if (type >= 80 && type <= 89) return "tanker";
  return "other";
}

const TYPE_LABELS: Readonly<Record<number, string>> = {
  30: "Fishing vessel",
  31: "Tug",
  32: "Tug",
  33: "Dredger",
  34: "Diving vessel",
  35: "Military vessel",
  36: "Sailing vessel",
  37: "Pleasure craft",
  50: "Pilot vessel",
  51: "Search and rescue vessel",
  52: "Tug",
  53: "Port tender",
  55: "Law enforcement vessel",
  58: "Medical transport",
};

/** What kind of ship this is, as precisely as its type code allows. */
export function shipTypeLabel(type: number | null): string {
  if (type === null) return "Ship";
  const exact = TYPE_LABELS[type];
  if (exact !== undefined) return exact;
  if (type >= 40 && type <= 49) return "High-speed craft";
  if (type >= 60 && type <= 69) return "Passenger ship";
  if (type >= 70 && type <= 79) return "Cargo ship";
  if (type >= 80 && type <= 89) return "Tanker";
  return "Ship";
}

const STATUS_LABELS: Readonly<Record<number, string>> = {
  0: "Under way",
  1: "At anchor",
  2: "Not under command",
  3: "Restricted manoeuvrability",
  4: "Constrained by draught",
  5: "Moored",
  6: "Aground",
  7: "Fishing",
  8: "Under sail",
};

export function navigationStatusLabel(status: number | null): string | null {
  return status === null ? null : (STATUS_LABELS[status] ?? null);
}

/** Many small craft never broadcast a name. */
export function shipDisplayName(ship: Pick<Ship, "mmsi" | "name">): string {
  return ship.name ?? `MMSI ${ship.mmsi}`;
}

/** Direction the icon points to: the bow when known, otherwise the direction of travel. */
export function shipBearing(ship: Pick<Ship, "heading" | "course">): number | null {
  return ship.heading ?? ship.course;
}

export function countByCategory(ships: readonly Ship[]): Record<ShipCategory, number> {
  const counts: Record<ShipCategory, number> = {
    cargo: 0,
    tanker: 0,
    passenger: 0,
    fishing: 0,
    other: 0,
  };
  for (const ship of ships) counts[ship.category] += 1;
  return counts;
}

/**
 * Ships travel as positional tuples, in the published file as well as between
 * `/api/ships` and the browser: with tens of thousands of ships, keyed objects
 * would double the payload.
 */
const shipTupleSchema = z.tuple([
  z.number().int(), // mmsi
  z.number().min(-90).max(90), // latitude
  z.number().min(-180).max(180), // longitude
  z.number().nullable(), // course
  z.number().nullable(), // speed, in knots
  z.number().nullable(), // heading
  z.number().nullable(), // navigational status
  z.number(), // last heard
  z.string().nullable(), // name
  z.number().nullable(), // AIS ship type
  z.string().nullable(), // destination
  z.number().nullable(), // length, in metres
]);

export type ShipTuple = z.infer<typeof shipTupleSchema>;

/** The file published by the "Publish ships" workflow. */
export const shipsSnapshotFileSchema = z.object({
  /** Unix time (seconds) the snapshot was written. */
  time: z.number(),
  ships: z.array(shipTupleSchema),
});

export const shipsSnapshotDtoSchema = shipsSnapshotFileSchema.extend({
  /** Unix time (seconds) after which a fresher snapshot may be available. */
  nextRefreshAt: z.number(),
});

export type ShipsSnapshotDto = z.infer<typeof shipsSnapshotDtoSchema>;

export const shipsErrorDtoSchema = z.object({
  error: z.object({
    code: z.enum(["not_configured", "upstream_unavailable"]),
    message: z.string(),
  }),
});

export type ShipsErrorDto = z.infer<typeof shipsErrorDtoSchema>;
export type ShipsErrorCode = ShipsErrorDto["error"]["code"];

export interface ShipsSnapshot {
  readonly time: number;
  readonly nextRefreshAt: number;
  readonly ships: readonly Ship[];
}

export function decodeShip(tuple: ShipTuple): Ship {
  return {
    mmsi: tuple[0],
    latitude: tuple[1],
    longitude: tuple[2],
    course: tuple[3],
    speedKnots: tuple[4],
    heading: tuple[5],
    status: tuple[6],
    seenAt: tuple[7],
    name: tuple[8],
    type: tuple[9],
    category: categoryOfType(tuple[9]),
    destination: tuple[10],
    lengthMetres: tuple[11],
  };
}

export function decodeShipsSnapshot(dto: ShipsSnapshotDto): ShipsSnapshot {
  return { time: dto.time, nextRefreshAt: dto.nextRefreshAt, ships: dto.ships.map(decodeShip) };
}
