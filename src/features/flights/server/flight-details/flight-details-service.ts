import "server-only";
import { serverEnv } from "@/shared/config/server-env";
import type { FlightDetails } from "../../domain/flight-details";
import { fetchAdsbdbAirframe } from "./adsbdb-airframe";
import { fetchAdsbdbRoute } from "./adsbdb-route";
import { fetchOpenSkyTrack } from "./opensky-track";

/** A failing source only blanks its own half of the answer. */
async function orNull<T>(source: string, request: Promise<T | null>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    console.error(
      `[flight-details] ${source} failed:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function getFlightDetails(
  icao24: string,
  callsign: string | null,
): Promise<FlightDetails> {
  const [track, route, airframe] = await Promise.all([
    orNull("OpenSky track", fetchOpenSkyTrack(icao24, serverEnv.openSkyCredentials)),
    callsign === null ? null : orNull("adsbdb route", fetchAdsbdbRoute(callsign)),
    orNull("adsbdb airframe", fetchAdsbdbAirframe(icao24)),
  ]);
  return { track, route, airframe };
}
