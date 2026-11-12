/** A single aircraft state, in SI units as reported by ADS-B. */
export interface Aircraft {
  /** Unique ICAO 24-bit transponder address, lowercase hex. */
  readonly icao24: string;
  readonly callsign: string | null;
  readonly originCountry: string;
  readonly longitude: number;
  readonly latitude: number;
  /** Metres above mean sea level. */
  readonly altitude: number | null;
  readonly onGround: boolean;
  /** Ground speed in m/s. */
  readonly velocity: number | null;
  /** True track in degrees, clockwise from north. */
  readonly track: number | null;
  /** Vertical rate in m/s, positive when climbing. */
  readonly verticalRate: number | null;
  /** Unix time (seconds) of the last position report. */
  readonly positionTime: number;
  readonly squawk: string | null;
}

export type Icao24 = Aircraft["icao24"];

export function displayName(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.icao24.toUpperCase();
}
