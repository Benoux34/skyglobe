import { z } from "zod";
import type { Aircraft } from "./aircraft";

/**
 * Wire contract between `/api/flights` and the browser.
 * Aircraft travel as positional tuples: with ~10k aircraft per snapshot this
 * halves the payload compared to keyed objects.
 */
const aircraftTupleSchema = z.tuple([
  z.string(), // icao24
  z.string().nullable(), // callsign
  z.string(), // originCountry
  z.number(), // longitude
  z.number(), // latitude
  z.number().nullable(), // altitude
  z.boolean(), // onGround
  z.number().nullable(), // velocity
  z.number().nullable(), // track
  z.number().nullable(), // verticalRate
  z.number(), // positionTime
  z.string().nullable(), // squawk
]);

export type AircraftTuple = z.infer<typeof aircraftTupleSchema>;

export const flightsSnapshotDtoSchema = z.object({
  /** Unix time (seconds) the snapshot was taken upstream. */
  time: z.number(),
  /** Unix time (seconds) after which a fresher snapshot may be available. */
  nextRefreshAt: z.number(),
  aircraft: z.array(aircraftTupleSchema),
});

export type FlightsSnapshotDto = z.infer<typeof flightsSnapshotDtoSchema>;

export const flightsErrorDtoSchema = z.object({
  error: z.object({
    code: z.enum(["rate_limited", "upstream_unavailable", "invalid_upstream_data"]),
    message: z.string(),
  }),
});

export type FlightsErrorDto = z.infer<typeof flightsErrorDtoSchema>;
export type FlightsErrorCode = FlightsErrorDto["error"]["code"];

export interface FlightsSnapshot {
  readonly time: number;
  readonly nextRefreshAt: number;
  readonly aircraft: readonly Aircraft[];
}

export function encodeAircraft(a: Aircraft): AircraftTuple {
  return [
    a.icao24,
    a.callsign,
    a.originCountry,
    a.longitude,
    a.latitude,
    a.altitude,
    a.onGround,
    a.velocity,
    a.track,
    a.verticalRate,
    a.positionTime,
    a.squawk,
  ];
}

export function decodeAircraft(t: AircraftTuple): Aircraft {
  return {
    icao24: t[0],
    callsign: t[1],
    originCountry: t[2],
    longitude: t[3],
    latitude: t[4],
    altitude: t[5],
    onGround: t[6],
    velocity: t[7],
    track: t[8],
    verticalRate: t[9],
    positionTime: t[10],
    squawk: t[11],
  };
}

export function encodeSnapshot(snapshot: FlightsSnapshot): FlightsSnapshotDto {
  return {
    time: snapshot.time,
    nextRefreshAt: snapshot.nextRefreshAt,
    aircraft: snapshot.aircraft.map(encodeAircraft),
  };
}

export function decodeSnapshot(dto: FlightsSnapshotDto): FlightsSnapshot {
  return {
    time: dto.time,
    nextRefreshAt: dto.nextRefreshAt,
    aircraft: dto.aircraft.map(decodeAircraft),
  };
}
