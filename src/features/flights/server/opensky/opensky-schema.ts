import "server-only";
import { z } from "zod";
import type { Aircraft } from "../../domain/aircraft";

/**
 * OpenSky state vector, see https://openskynetwork.github.io/opensky-api/rest.html
 * Trailing fields we do not use (position source, category) are tolerated.
 */
const stateVectorSchema = z
  .tuple([
    z.string(), // 0 icao24
    z.string().nullable(), // 1 callsign
    z.string(), // 2 origin_country
    z.number().nullable(), // 3 time_position
    z.number(), // 4 last_contact
    z.number().nullable(), // 5 longitude
    z.number().nullable(), // 6 latitude
    z.number().nullable(), // 7 baro_altitude
    z.boolean(), // 8 on_ground
    z.number().nullable(), // 9 velocity
    z.number().nullable(), // 10 true_track
    z.number().nullable(), // 11 vertical_rate
    z.unknown(), // 12 sensors
    z.number().nullable(), // 13 geo_altitude
    z.string().nullable(), // 14 squawk
  ])
  .rest(z.unknown());

export const openSkyStatesSchema = z.object({
  time: z.number(),
  states: z.array(stateVectorSchema).nullable(),
});

export type OpenSkyStates = z.infer<typeof openSkyStatesSchema>;
type StateVector = z.infer<typeof stateVectorSchema>;

/** Returns `null` for aircraft without a usable position. */
export function toAircraft(state: StateVector): Aircraft | null {
  const [
    icao24,
    callsign,
    originCountry,
    timePosition,
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    track,
    verticalRate,
    ,
    geoAltitude,
    squawk,
  ] = state;

  if (longitude === null || latitude === null) return null;

  const trimmedCallsign = callsign?.trim() ?? "";
  return {
    icao24: icao24.toLowerCase(),
    callsign: trimmedCallsign === "" ? null : trimmedCallsign,
    originCountry,
    longitude,
    latitude,
    altitude: baroAltitude ?? geoAltitude,
    onGround,
    velocity,
    track,
    verticalRate,
    positionTime: timePosition ?? lastContact,
    squawk,
  };
}
