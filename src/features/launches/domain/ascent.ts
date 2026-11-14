import type { Launch, LaunchPad } from "./launch";

/*
 * Nobody publishes the trajectory of a rocket ahead of its launch. What is
 * drawn is a plausible ascent: it leaves the pad in the direction the target
 * orbit requires and follows the altitude and speed of a typical climb to low
 * orbit. Good enough to see where a launch is heading, not a flight plan.
 */

/** From lift-off to orbit insertion, for a typical launcher. */
export const ASCENT_DURATION_SECONDS = 540;
/** A replay runs this many times faster than the real ascent. */
export const REPLAY_SPEED = 15;

const INSERTION_ALTITUDE_KM = 200;
/** Chosen so that the rocket ends at orbital speed, about 7.8 km/s. */
const INSERTION_DOWNRANGE_KM = 1620;
const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

const SUN_SYNCHRONOUS_INCLINATION = 97.5;
const SPACE_STATION_INCLINATION = 51.6;
const NAVIGATION_INCLINATION = 55;
const DEFAULT_INCLINATION = 45;
/** Orbits reached by first launching due east, to borrow the most speed from the Earth's spin. */
const DUE_EAST_ORBITS = new Set(["GTO", "GEO", "GSO", "LO", "HEO", "HCO", "L1", "L2"]);
/** North of this latitude, launches to polar orbits head north rather than south. */
const NORTHBOUND_POLAR_LATITUDE = 50;

export interface AscentPoint {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitudeKm: number;
}

export interface AscentState extends AscentPoint {
  /** Distance travelled along the ground since lift-off. */
  readonly downrangeKm: number;
  readonly speedKmh: number;
}

/** A launch being replayed ahead of time, for the user to see where it will go. */
export interface Replay {
  readonly launchId: Launch["id"];
  /** `Date.now()` when the replay started. */
  readonly startedAtMs: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Inclination of the orbit a launch is most likely aiming for, in degrees. */
export function targetInclination(
  launch: Pick<Launch, "orbit" | "mission" | "rocket">,
  pad: LaunchPad,
): number {
  const orbit = launch.orbit?.toUpperCase() ?? "";
  const words = `${launch.mission ?? ""} ${launch.rocket}`.toLowerCase();
  // An orbit can never be less inclined than the latitude it is launched from.
  const lowest = Math.abs(pad.latitude);

  if (orbit === "SSO" || orbit === "PO" || /sun-?synchronous|polar/.test(words)) {
    return SUN_SYNCHRONOUS_INCLINATION;
  }
  if (/\b(iss|crew|cargo dragon|crs|progress|soyuz ms|cygnus)\b/.test(words)) {
    return Math.max(lowest, SPACE_STATION_INCLINATION);
  }
  if (DUE_EAST_ORBITS.has(orbit)) return lowest;
  if (orbit === "MEO") return Math.max(lowest, NAVIGATION_INCLINATION);
  return Math.max(lowest, DEFAULT_INCLINATION);
}

/** Compass direction in which the rocket leaves the pad, in degrees clockwise from north. */
export function ascentAzimuth(
  launch: Pick<Launch, "orbit" | "mission" | "rocket">,
  pad: LaunchPad,
): number {
  const inclination = targetInclination(launch, pad);
  const ratio = clamp(
    Math.cos(inclination * DEG_TO_RAD) / Math.cos(pad.latitude * DEG_TO_RAD),
    -1,
    1,
  );
  // Two directions reach the same inclination: this one points north, the other south.
  const northward = Math.asin(ratio) / DEG_TO_RAD;
  if (inclination <= 90) return northward;
  return Math.abs(pad.latitude) >= NORTHBOUND_POLAR_LATITUDE
    ? (northward + 360) % 360
    : 180 - northward;
}

/** Altitude and distance covered, `seconds` after lift-off: straight up first, then mostly forward. */
function profileAt(seconds: number): { altitudeKm: number; downrangeKm: number } {
  const progress = clamp(seconds / ASCENT_DURATION_SECONDS, 0, 1);
  return {
    altitudeKm: INSERTION_ALTITUDE_KM * (1 - (1 - progress) ** 2.4),
    downrangeKm: INSERTION_DOWNRANGE_KM * progress ** 2.6,
  };
}

/** The point reached by travelling `distanceKm` from the pad along a compass direction. */
function destination(
  pad: LaunchPad,
  azimuth: number,
  distanceKm: number,
): Pick<AscentPoint, "latitude" | "longitude"> {
  const angle = distanceKm / EARTH_RADIUS_KM;
  const latitude = pad.latitude * DEG_TO_RAD;
  const bearing = azimuth * DEG_TO_RAD;
  const sinLatitude =
    Math.sin(latitude) * Math.cos(angle) + Math.cos(latitude) * Math.sin(angle) * Math.cos(bearing);
  const longitudeShift = Math.atan2(
    Math.sin(bearing) * Math.sin(angle) * Math.cos(latitude),
    Math.cos(angle) - Math.sin(latitude) * sinLatitude,
  );
  return {
    latitude: Math.asin(clamp(sinLatitude, -1, 1)) / DEG_TO_RAD,
    longitude: ((pad.longitude + longitudeShift / DEG_TO_RAD + 540) % 360) - 180,
  };
}

/** Where the rocket is `seconds` after lift-off. */
export function ascentStateAt(pad: LaunchPad, azimuth: number, seconds: number): AscentState {
  const now = profileAt(seconds);
  const before = profileAt(seconds - 1);
  const speedKmS = Math.hypot(
    now.altitudeKm - before.altitudeKm,
    now.downrangeKm - before.downrangeKm,
  );
  return {
    ...destination(pad, azimuth, now.downrangeKm),
    altitudeKm: now.altitudeKm,
    downrangeKm: now.downrangeKm,
    speedKmh: speedKmS * 3600,
  };
}

/** The ascent from lift-off to `untilSeconds`, as `segments + 1` evenly timed points. */
export function ascentPath(
  pad: LaunchPad,
  azimuth: number,
  untilSeconds: number,
  segments: number,
): AscentPoint[] {
  return Array.from({ length: segments + 1 }, (_, index) =>
    ascentStateAt(pad, azimuth, (untilSeconds * index) / segments),
  );
}

export interface Ascent {
  readonly launch: Launch;
  readonly pad: LaunchPad;
  /** The replay driving this ascent, or `null` when the launch is really under way. */
  readonly replay: Replay | null;
}

/** Statuses under which a launch whose time has come is assumed to have lifted off. */
const FLYING_STATUSES = new Set(["go", "in flight", "success"]);

/** Seconds since lift-off of an ascent, in the time of the rocket. */
export function ascentSeconds(ascent: Ascent, nowMs: number): number {
  return ascent.replay === null
    ? nowMs / 1000 - ascent.launch.liftoffTime
    : ((nowMs - ascent.replay.startedAtMs) / 1000) * REPLAY_SPEED;
}

/** The ascent to draw: the replay the user asked for, otherwise a launch climbing right now. */
export function currentAscent(
  launches: readonly Launch[],
  replay: Replay | null,
  nowMs: number,
): Ascent | null {
  const candidates: Ascent[] = [];
  for (const launch of launches) {
    if (launch.pad === null) continue;
    if (replay !== null && replay.launchId === launch.id) {
      candidates.unshift({ launch, pad: launch.pad, replay });
    } else if (FLYING_STATUSES.has(launch.status?.toLowerCase() ?? "")) {
      candidates.push({ launch, pad: launch.pad, replay: null });
    }
  }
  return (
    candidates.find((ascent) => {
      const seconds = ascentSeconds(ascent, nowMs);
      return seconds >= 0 && seconds <= ASCENT_DURATION_SECONDS;
    }) ?? null
  );
}
