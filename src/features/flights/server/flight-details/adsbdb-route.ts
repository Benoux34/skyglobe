import "server-only";
import { z } from "zod";
import type { Airport, FlightRoute } from "../../domain/flight-details";

/** Free community route database, no key required: https://www.adsbdb.com */
const CALLSIGN_URL = "https://api.adsbdb.com/v0/callsign";

const adsbdbAirportSchema = z.object({
  iata_code: z.string().nullish(),
  icao_code: z.string().nullish(),
  name: z.string(),
  municipality: z.string().nullish(),
  country_name: z.string().nullish(),
  latitude: z.number(),
  longitude: z.number(),
});

const adsbdbResponseSchema = z.object({
  response: z.object({
    flightroute: z.object({
      airline: z.object({ name: z.string() }).nullish(),
      origin: adsbdbAirportSchema,
      destination: adsbdbAirportSchema,
    }),
  }),
});

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value === "" ? null : value;

const toAirport = (airport: z.infer<typeof adsbdbAirportSchema>): Airport => ({
  iata: emptyToNull(airport.iata_code),
  icao: emptyToNull(airport.icao_code),
  name: airport.name,
  city: emptyToNull(airport.municipality),
  country: emptyToNull(airport.country_name),
  latitude: airport.latitude,
  longitude: airport.longitude,
});

/** Scheduled origin and destination for a callsign, or `null` when unknown. */
export async function fetchAdsbdbRoute(callsign: string): Promise<FlightRoute | null> {
  const response = await fetch(`${CALLSIGN_URL}/${encodeURIComponent(callsign)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const parsed = adsbdbResponseSchema.safeParse(await response.json());
  if (!parsed.success) return null;

  const { airline, origin, destination } = parsed.data.response.flightroute;
  return {
    airline: airline?.name ?? null,
    origin: toAirport(origin),
    destination: toAirport(destination),
  };
}
