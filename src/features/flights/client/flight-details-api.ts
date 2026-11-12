import {
  CALLSIGN_PATTERN,
  flightDetailsSchema,
  type FlightDetails,
} from "../domain/flight-details";

export async function fetchFlightDetails(
  icao24: string,
  callsign: string | null,
  signal: AbortSignal,
): Promise<FlightDetails> {
  const query =
    callsign !== null && CALLSIGN_PATTERN.test(callsign)
      ? `?callsign=${encodeURIComponent(callsign)}`
      : "";
  const response = await fetch(`/api/flights/${encodeURIComponent(icao24)}/details${query}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Flight details request failed (${response.status}).`);
  return flightDetailsSchema.parse(await response.json());
}
