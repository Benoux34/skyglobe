import { gstime } from "satellite.js";
import { satelliteStateAt, type Orbit, type Vec3Km } from "@/features/satellites/domain/orbit";
import { lookAt, MIN_VISIBLE_ELEVATION, type Observer } from "./sky";

/** One crossing of the observer's sky by a satellite. */
export interface Pass {
  /** When it rises above the horizon, in Unix milliseconds. */
  readonly start: number;
  /** When it is highest. */
  readonly peak: number;
  readonly end: number;
  /** Degrees above the horizon at its highest. */
  readonly maxElevation: number;
  /** Compass directions in which it appears and disappears, in degrees. */
  readonly startAzimuth: number;
  readonly endAzimuth: number;
  /** True when it can be seen with the naked eye: dark sky, satellite still in sunlight. */
  readonly visible: boolean;
}

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const STEP_MS = 20_000;
/** The sky is dark enough once the Sun is this far below the horizon (civil twilight). */
const DARK_SKY_SUN_ELEVATION = -6;
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const MS_PER_DAY = 86_400_000;

/**
 * Direction of the Sun from the Earth's centre, as a unit vector in the frame
 * that turns with the Earth. Low-precision formula of the Astronomical
 * Almanac, good to a hundredth of a degree: plenty to tell day from night.
 */
export function sunDirection(date: Date): Vec3Km {
  const days = (date.getTime() - J2000_MS) / MS_PER_DAY;
  const meanLongitude = (280.46 + 0.9856474 * days) * DEG_TO_RAD;
  const meanAnomaly = (357.528 + 0.9856003 * days) * DEG_TO_RAD;
  const eclipticLongitude =
    meanLongitude + (1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG_TO_RAD;
  const obliquity = (23.439 - 0.0000004 * days) * DEG_TO_RAD;

  // In the frame of the stars...
  const x = Math.cos(eclipticLongitude);
  const y = Math.cos(obliquity) * Math.sin(eclipticLongitude);
  const z = Math.sin(obliquity) * Math.sin(eclipticLongitude);
  // ...then turned by the Earth's rotation angle at that instant.
  const rotation = gstime(date);
  return {
    x: x * Math.cos(rotation) + y * Math.sin(rotation),
    y: -x * Math.sin(rotation) + y * Math.cos(rotation),
    z,
  };
}

/** Degrees of the Sun above the observer's horizon. */
export function sunElevation(observer: Observer, sun: Vec3Km): number {
  const latitude = observer.latitude * DEG_TO_RAD;
  const longitude = observer.longitude * DEG_TO_RAD;
  const towardsSun =
    Math.cos(latitude) * Math.cos(longitude) * sun.x +
    Math.cos(latitude) * Math.sin(longitude) * sun.y +
    Math.sin(latitude) * sun.z;
  return Math.asin(Math.min(1, Math.max(-1, towardsSun))) / DEG_TO_RAD;
}

/** False inside the Earth's shadow, taken as a cylinder pointing away from the Sun. */
export function isSunlit(position: Vec3Km, sun: Vec3Km): boolean {
  const alongSun = position.x * sun.x + position.y * sun.y + position.z * sun.z;
  if (alongSun >= 0) return true;
  const distanceFromAxis = Math.sqrt(
    Math.max(0, position.x ** 2 + position.y ** 2 + position.z ** 2 - alongSun ** 2),
  );
  return distanceFromAxis > EARTH_RADIUS_KM;
}

interface Sample {
  readonly time: number;
  readonly elevation: number;
  readonly azimuth: number;
  readonly position: Vec3Km;
}

function sampleAt(orbit: Orbit, observer: Observer, time: number): Sample | null {
  const state = satelliteStateAt(orbit, new Date(time));
  if (state === null) return null;
  const sky = lookAt(observer, state);
  return { time, elevation: sky.elevation, azimuth: sky.azimuth, position: state.position };
}

/**
 * The passes of a satellite over the observer during the `hours` after
 * `fromMs`, the earliest first. Passes that stay low on the horizon are left out.
 */
export function predictPasses(
  orbit: Orbit,
  observer: Observer,
  fromMs: number,
  hours: number,
): Pass[] {
  const passes: Pass[] = [];
  let first: Sample | null = null;
  let highest: Sample | null = null;
  let last: Sample | null = null;

  const close = (): void => {
    if (first !== null && highest !== null && last !== null) {
      if (highest.elevation >= MIN_VISIBLE_ELEVATION) {
        const sun = sunDirection(new Date(highest.time));
        passes.push({
          start: first.time,
          peak: highest.time,
          end: last.time,
          maxElevation: highest.elevation,
          startAzimuth: first.azimuth,
          endAzimuth: last.azimuth,
          visible:
            sunElevation(observer, sun) < DARK_SKY_SUN_ELEVATION && isSunlit(highest.position, sun),
        });
      }
    }
    first = null;
    highest = null;
    last = null;
  };

  const untilMs = fromMs + hours * 3_600_000;
  for (let time = fromMs; time <= untilMs; time += STEP_MS) {
    const sample = sampleAt(orbit, observer, time);
    if (sample === null || sample.elevation <= 0) {
      close();
      continue;
    }
    first ??= sample;
    if (highest === null || sample.elevation > highest.elevation) highest = sample;
    last = sample;
  }
  close();
  return passes;
}
