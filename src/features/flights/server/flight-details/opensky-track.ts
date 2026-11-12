import "server-only";
import { z } from "zod";
import type { OpenSkyAccess } from "@/shared/config/server-env";
import type { TrackPoint } from "../../domain/flight-details";
import { requestTrack } from "../opensky/opensky-request";

const REQUEST_TIMEOUT_MS = 10_000;

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

/**
 * Waypoints of the flight currently flown by `icao24`, or `null` when OpenSky
 * has none or cannot be asked (a published snapshot holds positions only).
 */
export async function fetchOpenSkyTrack(
  icao24: string,
  access: OpenSkyAccess,
): Promise<TrackPoint[] | null> {
  if (access.kind === "snapshot") return null;

  const response = await requestTrack(access, icao24, REQUEST_TIMEOUT_MS);
  if (!response.ok) return null;

  const parsed = trackSchema.safeParse(await response.json());
  if (!parsed.success) return null;

  const points: TrackPoint[] = [];
  for (const [time, latitude, longitude, altitude] of parsed.data.path) {
    if (latitude !== null && longitude !== null) points.push([time, latitude, longitude, altitude]);
  }
  return points.length === 0 ? null : points;
}
