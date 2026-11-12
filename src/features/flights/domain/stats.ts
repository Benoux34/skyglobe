import type { Aircraft } from "./aircraft";
import { ALTITUDE_BANDS, bandContains, type AltitudeBand } from "./altitude";

export interface CountryCount {
  readonly country: string;
  readonly count: number;
}

export interface AltitudeBandCount {
  readonly band: AltitudeBand;
  readonly count: number;
}

export interface FlightStats {
  readonly total: number;
  readonly airborne: number;
  readonly onGround: number;
  /** Mean ground speed of airborne aircraft, m/s. */
  readonly meanAirborneSpeed: number | null;
  readonly countries: readonly CountryCount[];
  readonly altitudeBands: readonly AltitudeBandCount[];
}

export function countByCountry(aircraft: readonly Aircraft[]): CountryCount[] {
  const counts = new Map<string, number>();
  for (const a of aircraft) {
    counts.set(a.originCountry, (counts.get(a.originCountry) ?? 0) + 1);
  }
  return [...counts]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}

export function computeStats(aircraft: readonly Aircraft[]): FlightStats {
  const airborne = aircraft.filter((a) => !a.onGround);
  const speeds = airborne.flatMap((a) => (a.velocity === null ? [] : [a.velocity]));

  return {
    total: aircraft.length,
    airborne: airborne.length,
    onGround: aircraft.length - airborne.length,
    meanAirborneSpeed:
      speeds.length === 0 ? null : speeds.reduce((sum, v) => sum + v, 0) / speeds.length,
    countries: countByCountry(aircraft),
    altitudeBands: ALTITUDE_BANDS.map((band) => ({
      band,
      count: airborne.filter((a) => bandContains(band, Math.max(0, a.altitude ?? 0))).length,
    })),
  };
}
