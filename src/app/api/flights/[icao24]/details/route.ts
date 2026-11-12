import type { NextRequest } from "next/server";
import {
  CALLSIGN_PATTERN,
  ICAO24_PATTERN,
  type FlightDetails,
} from "@/features/flights/domain/flight-details";
import { getFlightDetails } from "@/features/flights/server/flight-details/flight-details-service";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/flights/[icao24]/details">,
): Promise<Response> {
  const { icao24 } = await context.params;
  const callsign = request.nextUrl.searchParams.get("callsign");

  // Both values end up in upstream URLs, so only strict identifiers get through.
  if (!ICAO24_PATTERN.test(icao24) || (callsign !== null && !CALLSIGN_PATTERN.test(callsign))) {
    return Response.json({ error: "Invalid aircraft identifier." }, { status: 400 });
  }

  const body: FlightDetails = await getFlightDetails(icao24, callsign);
  return Response.json(body, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=30" },
  });
}
