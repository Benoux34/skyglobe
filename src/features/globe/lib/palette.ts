import type { Theme } from "@/shared/theme/theme";

export interface GlobePalette {
  readonly ocean: string;
  readonly land: string;
  readonly border: string;
  /** Tint blended in towards the limb to give the flat sphere some volume. */
  readonly rim: string;
  /** Selection ring, flight path and airport markers. */
  readonly ink: string;
  /** Multiplied with the altitude colours so icons keep contrast on a pale map. */
  readonly aircraftTint: string;
  /** Rings around aircraft in distress. */
  readonly alert: string;
}

/** WebGL cannot read CSS variables, so the globe mirrors the tokens of globals.css here. */
export const GLOBE_PALETTES: Readonly<Record<Theme, GlobePalette>> = {
  light: {
    ocean: "#f8f3ea",
    land: "#d9cfbd",
    border: "#c2b59d",
    rim: "#d9cfbd",
    ink: "#1f1b16",
    aircraftTint: "#8f8f8f",
    alert: "#c62828",
  },
  dark: {
    ocean: "#0a0a0a",
    land: "#242424",
    border: "#3d3d3d",
    rim: "#262626",
    ink: "#ededed",
    aircraftTint: "#ffffff",
    alert: "#ef4444",
  },
};
