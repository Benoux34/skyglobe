import { z } from "zod";

const airportSchema = z.object({
  iata: z.string().nullable(),
  icao: z.string().nullable(),
  name: z.string(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
});

const flightRouteSchema = z.object({
  airline: z.string().nullable(),
  origin: airportSchema,
  destination: airportSchema,
});

const airframeSchema = z.object({
  /** e.g. "A380 861". */
  model: z.string().nullable(),
  manufacturer: z.string().nullable(),
  /** ICAO type designator, e.g. "A388". */
  typeCode: z.string().nullable(),
  registration: z.string().nullable(),
  owner: z.string().nullable(),
  photoUrl: z.string().nullable(),
});

/** Positional tuple to keep long tracks compact on the wire. */
const trackPointSchema = z.tuple([
  z.number(), // unix time, seconds
  z.number(), // latitude
  z.number(), // longitude
  z.number().nullable(), // altitude, metres
]);

/**
 * Wire contract of `/api/flights/:icao24/details`.
 * Every part is best-effort: each can be `null` when its source has nothing.
 */
export const flightDetailsSchema = z.object({
  /** Positions actually flown since take-off, oldest first. */
  track: z.array(trackPointSchema).nullable(),
  /** Scheduled route for the callsign, from a community database. */
  route: flightRouteSchema.nullable(),
  /** The physical aircraft: model, registration and a photo. */
  airframe: airframeSchema.nullable(),
});

export type Airport = z.infer<typeof airportSchema>;
export type Airframe = z.infer<typeof airframeSchema>;
export type FlightRoute = z.infer<typeof flightRouteSchema>;
export type TrackPoint = z.infer<typeof trackPointSchema>;
export type FlightDetails = z.infer<typeof flightDetailsSchema>;

export const ICAO24_PATTERN = /^[0-9a-f]{6}$/;
export const CALLSIGN_PATTERN = /^[A-Z0-9]{2,8}$/;

export const airportCode = (airport: Airport): string =>
  airport.iata ?? airport.icao ?? airport.name;
