import type { SatelliteGroup } from "@/features/satellites/domain/satellite";
import type { ShipCategory } from "@/features/ships/domain/ship";
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
  readonly satellites: Readonly<Record<SatelliteGroup, string>>;
  readonly ships: Readonly<Record<ShipCategory, string>>;
  /** Launch pad markers. */
  readonly launch: string;
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
    // Starlink is two thirds of the catalogue: it stays quiet so the rest reads.
    satellites: {
      station: "#be123c",
      starlink: "#a39a8b",
      navigation: "#b45309",
      other: "#0f766e",
    },
    ships: {
      cargo: "#1d4ed8",
      tanker: "#7e22ce",
      passenger: "#be185d",
      fishing: "#4d7c0f",
      other: "#78716c",
    },
    launch: "#c2410c",
  },
  dark: {
    ocean: "#0a0a0a",
    land: "#242424",
    border: "#3d3d3d",
    rim: "#262626",
    ink: "#ededed",
    aircraftTint: "#ffffff",
    alert: "#ef4444",
    satellites: {
      station: "#fb7185",
      starlink: "#6f6f6f",
      navigation: "#fbbf24",
      other: "#2dd4bf",
    },
    ships: {
      cargo: "#60a5fa",
      tanker: "#c084fc",
      passenger: "#f472b6",
      fishing: "#a3e635",
      other: "#8a8a8a",
    },
    launch: "#fb923c",
  },
};
