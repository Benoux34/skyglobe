import type { Aircraft } from "@/features/flights/domain/aircraft";

/** Where the user stands. */
export interface Observer {
  readonly latitude: number;
  readonly longitude: number;
}

/** Something in the sky, by where it is over the Earth. */
export interface SkyTarget {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitudeKm: number;
}

/** Where to look to see something. */
export interface SkyPosition {
  /** Degrees above the horizon; negative when the Earth hides it. */
  readonly elevation: number;
  /** Compass direction, in degrees clockwise from north. */
  readonly azimuth: number;
  /** Straight-line distance, in kilometres. */
  readonly rangeKm: number;
}

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

/** Below this, things are lost in the haze and behind buildings and hills. */
export const MIN_VISIBLE_ELEVATION = 10;

/** Where `target` appears in the sky of `observer`, on a spherical Earth. */
export function lookAt(observer: Observer, target: SkyTarget): SkyPosition {
  const latitude = observer.latitude * DEG_TO_RAD;
  const longitude = observer.longitude * DEG_TO_RAD;
  const targetLatitude = target.latitude * DEG_TO_RAD;
  const targetLongitude = target.longitude * DEG_TO_RAD;
  const targetRadius = EARTH_RADIUS_KM + target.altitudeKm;

  // From the observer to the target, in Earth-centred coordinates.
  const dx =
    targetRadius * Math.cos(targetLatitude) * Math.cos(targetLongitude) -
    EARTH_RADIUS_KM * Math.cos(latitude) * Math.cos(longitude);
  const dy =
    targetRadius * Math.cos(targetLatitude) * Math.sin(targetLongitude) -
    EARTH_RADIUS_KM * Math.cos(latitude) * Math.sin(longitude);
  const dz = targetRadius * Math.sin(targetLatitude) - EARTH_RADIUS_KM * Math.sin(latitude);

  // The same vector, along the observer's east, north and up.
  const east = -Math.sin(longitude) * dx + Math.cos(longitude) * dy;
  const north =
    -Math.sin(latitude) * Math.cos(longitude) * dx -
    Math.sin(latitude) * Math.sin(longitude) * dy +
    Math.cos(latitude) * dz;
  const up =
    Math.cos(latitude) * Math.cos(longitude) * dx +
    Math.cos(latitude) * Math.sin(longitude) * dy +
    Math.sin(latitude) * dz;

  const rangeKm = Math.hypot(dx, dy, dz);
  return {
    elevation: rangeKm === 0 ? 90 : Math.asin(up / rangeKm) / DEG_TO_RAD,
    azimuth: (Math.atan2(east, north) / DEG_TO_RAD + 360) % 360,
    rangeKm,
  };
}

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** "N", "NE", "E"… for a direction in degrees. */
export function compassPoint(azimuth: number): string {
  const normalized = ((azimuth % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 45) % COMPASS_POINTS.length] ?? "N";
}

export interface AircraftAbove {
  readonly aircraft: Aircraft;
  readonly sky: SkyPosition;
}

/** Aircraft flying high enough in the observer's sky to be seen, the highest first. */
export function aircraftAbove(aircraft: readonly Aircraft[], observer: Observer): AircraftAbove[] {
  const above: AircraftAbove[] = [];
  for (const candidate of aircraft) {
    if (candidate.onGround || candidate.altitude === null || candidate.altitude <= 0) continue;
    // Cheap first cut: at airliner heights, 10° of elevation is under 100 km away.
    if (
      Math.abs(candidate.latitude - observer.latitude) > 2 ||
      Math.abs(candidate.longitude - observer.longitude) > 4
    ) {
      continue;
    }
    const sky = lookAt(observer, {
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      altitudeKm: candidate.altitude / 1000,
    });
    if (sky.elevation >= MIN_VISIBLE_ELEVATION) above.push({ aircraft: candidate, sky });
  }
  return above.sort((a, b) => b.sky.elevation - a.sky.elevation);
}
