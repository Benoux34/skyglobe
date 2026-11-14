import {
  degreesLat,
  degreesLong,
  eciToEcf,
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec,
  type SatRec,
} from "satellite.js";
import type { SatelliteRecord } from "./satellite";

const EARTH_ROTATION_RAD_PER_SECOND = 7.292115e-5;

/** Ready-to-propagate orbit of one satellite (SGP4 model). */
export type Orbit = SatRec;

export interface Vec3Km {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Where a satellite is at one instant, in the frame that rotates with the Earth. */
export interface SatelliteState {
  /** Kilometres from the Earth's centre. */
  readonly position: Vec3Km;
  /** Kilometres per second relative to the ground. */
  readonly groundVelocity: Vec3Km;
  readonly latitude: number;
  readonly longitude: number;
  readonly altitudeKm: number;
  /** Orbital speed in kilometres per second. */
  readonly speedKmS: number;
}

/** `null` when the element set is unusable. */
export function createOrbit(record: Pick<SatelliteRecord, "line1" | "line2">): Orbit | null {
  try {
    const orbit = twoline2satrec(record.line1, record.line2);
    return orbit.error === 0 && Number.isFinite(orbit.no) && orbit.no > 0 ? orbit : null;
  } catch {
    return null;
  }
}

/** `null` when the model cannot place the satellite, typically because it has decayed. */
export function satelliteStateAt(orbit: Orbit, date: Date): SatelliteState | null {
  const propagated = propagate(orbit, date);
  if (propagated === null) return null;

  const { position: inertial, velocity } = propagated;
  if (
    !Number.isFinite(inertial.x) ||
    !Number.isFinite(inertial.y) ||
    !Number.isFinite(inertial.z)
  ) {
    return null;
  }

  const gmst = gstime(date);
  const geodetic = eciToGeodetic(inertial, gmst);
  const position = eciToEcf(inertial, gmst);
  // Same vector seen from the turning Earth, minus the ground's own motion below it.
  const turned = eciToEcf(velocity, gmst);
  return {
    position,
    groundVelocity: {
      x: turned.x + EARTH_ROTATION_RAD_PER_SECOND * position.y,
      y: turned.y - EARTH_ROTATION_RAD_PER_SECOND * position.x,
      z: turned.z,
    },
    latitude: degreesLat(geodetic.latitude),
    longitude: degreesLong(geodetic.longitude),
    altitudeKm: geodetic.height,
    speedKmS: Math.hypot(velocity.x, velocity.y, velocity.z),
  };
}

export function orbitalPeriodMinutes(orbit: Orbit): number {
  // `no` is the mean motion in radians per minute.
  return (2 * Math.PI) / orbit.no;
}

export function inclinationDegrees(orbit: Orbit): number {
  return (orbit.inclo * 180) / Math.PI;
}

/**
 * One full revolution centred on `date`, as it stands in space at that
 * instant: an ellipse drawn in the Earth's frame of that same instant.
 *
 * An orbit drifts by tens of kilometres per revolution, so the two ends do not
 * quite meet. Centring the path puts that seam half an orbit away from the
 * satellite, on the far side of the Earth, instead of right next to it.
 */
export function orbitPathAt(orbit: Orbit, date: Date, points: number): Vec3Km[] {
  const gmst = gstime(date);
  const periodMs = orbitalPeriodMinutes(orbit) * 60_000;
  const path: Vec3Km[] = [];
  for (let index = 0; index <= points; index++) {
    const offsetMs = periodMs * (index / points - 0.5);
    const propagated = propagate(orbit, new Date(date.getTime() + offsetMs));
    if (propagated !== null) path.push(eciToEcf(propagated.position, gmst));
  }
  return path;
}
