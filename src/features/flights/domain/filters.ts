import { metresToFeet, msToKnots } from "@/shared/lib/units";
import type { Aircraft } from "./aircraft";
import { MAX_ALTITUDE_FEET } from "./altitude";

export interface NumericRange {
  readonly min: number;
  readonly max: number;
}

export interface FlightFilters {
  /** Feet. The upper bound is open-ended when it equals the slider maximum. */
  readonly altitudeFeet: NumericRange;
  /** Knots. The upper bound is open-ended when it equals the slider maximum. */
  readonly speedKnots: NumericRange;
  readonly includeOnGround: boolean;
  /** `null` means every country. */
  readonly country: string | null;
}

export const ALTITUDE_FILTER_BOUNDS: NumericRange = { min: 0, max: MAX_ALTITUDE_FEET };
export const SPEED_FILTER_BOUNDS: NumericRange = { min: 0, max: 600 };

export const DEFAULT_FILTERS: FlightFilters = {
  altitudeFeet: ALTITUDE_FILTER_BOUNDS,
  speedKnots: SPEED_FILTER_BOUNDS,
  includeOnGround: false,
  country: null,
};

function inRange(value: number, range: NumericRange, bounds: NumericRange): boolean {
  if (value < range.min) return false;
  return range.max >= bounds.max || value <= range.max;
}

export function matchesFilters(aircraft: Aircraft, filters: FlightFilters): boolean {
  if (filters.country !== null && aircraft.originCountry !== filters.country) return false;
  if (aircraft.onGround) return filters.includeOnGround;

  const altitudeFeet = Math.max(0, metresToFeet(aircraft.altitude ?? 0));
  if (!inRange(altitudeFeet, filters.altitudeFeet, ALTITUDE_FILTER_BOUNDS)) return false;

  const speedKnots = msToKnots(aircraft.velocity ?? 0);
  return inRange(speedKnots, filters.speedKnots, SPEED_FILTER_BOUNDS);
}

export function countActiveFilters(filters: FlightFilters): number {
  const isDefaultRange = (range: NumericRange, bounds: NumericRange) =>
    range.min === bounds.min && range.max === bounds.max;
  return [
    !isDefaultRange(filters.altitudeFeet, ALTITUDE_FILTER_BOUNDS),
    !isDefaultRange(filters.speedKnots, SPEED_FILTER_BOUNDS),
    filters.includeOnGround !== DEFAULT_FILTERS.includeOnGround,
    filters.country !== null,
  ].filter(Boolean).length;
}
