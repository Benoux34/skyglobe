export type Vec3 = readonly [x: number, y: number, z: number];

const DEG_TO_RAD = Math.PI / 180;

export const EARTH_RADIUS_METRES = 6_371_000;

/**
 * Scene convention: unit-radius Earth, +Y through the north pole, longitude 0
 * on +X, east towards -Z. Matches three.js `SphereGeometry` UVs with an
 * equirectangular texture.
 */
export function latLonToUnitVector(latitudeDeg: number, longitudeDeg: number): Vec3 {
  const lat = latitudeDeg * DEG_TO_RAD;
  const lon = longitudeDeg * DEG_TO_RAD;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}

/** Unit vector tangent to the sphere pointing along a compass track (clockwise from north). */
export function trackToTangent(latitudeDeg: number, longitudeDeg: number, trackDeg: number): Vec3 {
  const lat = latitudeDeg * DEG_TO_RAD;
  const lon = longitudeDeg * DEG_TO_RAD;
  const track = trackDeg * DEG_TO_RAD;

  const north: Vec3 = [
    -Math.sin(lat) * Math.cos(lon),
    Math.cos(lat),
    Math.sin(lat) * Math.sin(lon),
  ];
  const east: Vec3 = [-Math.sin(lon), 0, -Math.cos(lon)];
  const cos = Math.cos(track);
  const sin = Math.sin(track);
  return [
    north[0] * cos + east[0] * sin,
    north[1] * cos + east[1] * sin,
    north[2] * cos + east[2] * sin,
  ];
}

/** Altitudes are exaggerated so that cruise levels separate visibly from the surface. */
const ALTITUDE_EXAGGERATION = 8;
/** Lowest radius anything is drawn at, just clear of the surface to avoid z-fighting. */
export const SURFACE_RADIUS = 1.002;

/** Distance from the Earth's centre, in Earth radii, at which an altitude is drawn. */
export function altitudeToRadius(altitudeMetres: number | null): number {
  return Math.max(
    SURFACE_RADIUS,
    1 + (Math.max(0, altitudeMetres ?? 0) / EARTH_RADIUS_METRES) * ALTITUDE_EXAGGERATION,
  );
}
