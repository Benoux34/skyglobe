import { metresToFeet } from "@/shared/lib/units";
import type { Aircraft } from "./aircraft";

export type Rgb = readonly [red: number, green: number, blue: number];

interface ColorStop {
  readonly feet: number;
  readonly color: Rgb;
}

/** Altitude colour ramp shared by the globe, the legend and the statistics. */
const ALTITUDE_RAMP: readonly [ColorStop, ...ColorStop[]] = [
  { feet: 0, color: [251, 191, 36] },
  { feet: 12_000, color: [52, 211, 153] },
  { feet: 28_000, color: [56, 189, 248] },
  { feet: 45_000, color: [192, 132, 252] },
];

export const GROUND_COLOR: Rgb = [148, 163, 184];
export const MAX_ALTITUDE_FEET = 45_000;

export function altitudeColor(altitudeFeet: number): Rgb {
  let lower = ALTITUDE_RAMP[0];
  for (const upper of ALTITUDE_RAMP) {
    if (altitudeFeet <= upper.feet) {
      const span = upper.feet - lower.feet;
      const t = span === 0 ? 0 : (altitudeFeet - lower.feet) / span;
      return [
        lower.color[0] + (upper.color[0] - lower.color[0]) * t,
        lower.color[1] + (upper.color[1] - lower.color[1]) * t,
        lower.color[2] + (upper.color[2] - lower.color[2]) * t,
      ];
    }
    lower = upper;
  }
  return lower.color;
}

export function aircraftColor(aircraft: Aircraft): Rgb {
  if (aircraft.onGround) return GROUND_COLOR;
  return altitudeColor(Math.max(0, metresToFeet(aircraft.altitude ?? 0)));
}

export const rgbToCss = (color: Rgb): string =>
  `rgb(${Math.round(color[0])} ${Math.round(color[1])} ${Math.round(color[2])})`;

export const ALTITUDE_GRADIENT_CSS = `linear-gradient(to right, ${ALTITUDE_RAMP.map(
  (stop) => `${rgbToCss(stop.color)} ${(stop.feet / MAX_ALTITUDE_FEET) * 100}%`,
).join(", ")})`;

export interface AltitudeBand {
  readonly label: string;
  readonly minFeet: number;
  readonly maxFeet: number;
}

export const ALTITUDE_BANDS: readonly AltitudeBand[] = [
  { label: "< 10k ft", minFeet: 0, maxFeet: 10_000 },
  { label: "10–20k", minFeet: 10_000, maxFeet: 20_000 },
  { label: "20–30k", minFeet: 20_000, maxFeet: 30_000 },
  { label: "30–40k", minFeet: 30_000, maxFeet: 40_000 },
  { label: "> 40k ft", minFeet: 40_000, maxFeet: Number.POSITIVE_INFINITY },
];

export function bandColor(band: AltitudeBand): Rgb {
  const upper = Number.isFinite(band.maxFeet) ? band.maxFeet : MAX_ALTITUDE_FEET;
  return altitudeColor((band.minFeet + upper) / 2);
}

export const bandContains = (band: AltitudeBand, altitudeMetres: number): boolean => {
  const feet = metresToFeet(altitudeMetres);
  return feet >= band.minFeet && feet < band.maxFeet;
};
