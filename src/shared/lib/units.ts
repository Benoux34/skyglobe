const FEET_PER_METRE = 3.28084;
const KNOTS_PER_MS = 1.943844;
const KMH_PER_MS = 3.6;

export const metresToFeet = (m: number): number => m * FEET_PER_METRE;
export const feetToMetres = (ft: number): number => ft / FEET_PER_METRE;
export const msToKnots = (ms: number): number => ms * KNOTS_PER_MS;
export const knotsToMs = (kt: number): number => kt / KNOTS_PER_MS;
export const msToKmh = (ms: number): number => ms * KMH_PER_MS;
export const msToFeetPerMinute = (ms: number): number => ms * FEET_PER_METRE * 60;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
