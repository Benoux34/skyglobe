import "server-only";
import { z } from "zod";
import type { OpenSkyCredentials } from "@/shared/config/server-env";
import type { TrackPoint } from "../../domain/flight-details";
import { getOpenSkyAccessToken } from "../opensky/opensky-auth";

const TRACK_URL = "https://opensky-network.org/api/tracks/all";

const trackSchema = z.object({
  path: z.array(
    z
      .tuple([
        z.number(), // time
        z.number().nullable(), // latitude
        z.number().nullable(), // longitude
        z.number().nullable(), // barometric altitude, metres
      ])
      .rest(z.unknown()),
  ),
});

/** Waypoints of the flight currently flown by `icao24`, or `null` when OpenSky has none. */
export async function fetchOpenSkyTrack(
  icao24: string,
  credentials: OpenSkyCredentials | null,
): Promise<TrackPoint[] | null> {
  const headers = new Headers({ Accept: "application/json" });
  if (credentials !== null) {
    headers.set("Authorization", `Bearer ${await getOpenSkyAccessToken(credentials)}`);
  }

  const url = `${TRACK_URL}?icao24=${encodeURIComponent(icao24)}&time=0`;
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const parsed = trackSchema.safeParse(await response.json());
  if (!parsed.success) return null;

  const points: TrackPoint[] = [];
  for (const [time, latitude, longitude, altitude] of parsed.data.path) {
    if (latitude !== null && longitude !== null) points.push([time, latitude, longitude, altitude]);
  }
  return points.length === 0 ? null : points;
}
