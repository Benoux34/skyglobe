import type { Airport, TrackPoint } from "@/features/flights/domain/flight-details";
import { altitudeToRadius, latLonToUnitVector, SURFACE_RADIUS, type Vec3 } from "./coordinates";

export const airportPosition = (airport: Airport): Vec3 => {
  const [x, y, z] = latLonToUnitVector(airport.latitude, airport.longitude);
  return [x * SURFACE_RADIUS, y * SURFACE_RADIUS, z * SURFACE_RADIUS];
};

/** Scene positions of the flown track, each waypoint at its own (exaggerated) altitude. */
export function trackPositions(track: readonly TrackPoint[]): Vec3[] {
  return track.map(([, latitude, longitude, altitude]) => {
    const [x, y, z] = latLonToUnitVector(latitude, longitude);
    const radius = altitudeToRadius(altitude);
    return [x * radius, y * radius, z * radius];
  });
}

/**
 * Writes a great-circle arc from `from` to `to` into `out` as xyz triples,
 * interpolating the radius linearly so the line descends towards the airport.
 */
export function writeArc(out: Float32Array, from: Vec3, to: Vec3): void {
  const segments = out.length / 3 - 1;
  const fromRadius = Math.hypot(...from);
  const toRadius = Math.hypot(...to);
  const cosAngle = (from[0] * to[0] + from[1] * to[1] + from[2] * to[2]) / (fromRadius * toRadius);
  const angle = Math.acos(Math.min(1, Math.max(-1, cosAngle)));
  const sinAngle = Math.sin(angle);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Spherical interpolation; falls back to linear when the points almost coincide.
    const a = sinAngle < 1e-6 ? 1 - t : Math.sin((1 - t) * angle) / sinAngle;
    const b = sinAngle < 1e-6 ? t : Math.sin(t * angle) / sinAngle;
    const radius = fromRadius + (toRadius - fromRadius) * t;
    out[i * 3] = ((a * from[0]) / fromRadius + (b * to[0]) / toRadius) * radius;
    out[i * 3 + 1] = ((a * from[1]) / fromRadius + (b * to[1]) / toRadius) * radius;
    out[i * 3 + 2] = ((a * from[2]) / fromRadius + (b * to[2]) / toRadius) * radius;
  }
}
