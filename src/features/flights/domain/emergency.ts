import type { Aircraft } from "./aircraft";
import type { Rgb } from "./altitude";

export type EmergencyCode = "7500" | "7600" | "7700";

export interface Emergency {
  readonly code: EmergencyCode;
  readonly label: string;
  readonly description: string;
}

/** Transponder codes reserved worldwide for aircraft in distress. */
const EMERGENCIES: ReadonlyMap<string, Emergency> = new Map<string, Emergency>([
  [
    "7700",
    {
      code: "7700",
      label: "General emergency",
      description: "The crew declared an emergency, such as a technical or medical problem.",
    },
  ],
  [
    "7600",
    {
      code: "7600",
      label: "Radio failure",
      description: "The aircraft lost radio contact with air traffic control.",
    },
  ],
  [
    "7500",
    {
      code: "7500",
      label: "Unlawful interference",
      description: "The crew signalled unlawful interference with the flight.",
    },
  ],
]);

/** Colour that replaces the altitude colour of an aircraft in distress. */
export const EMERGENCY_COLOR: Rgb = [239, 68, 68];

export function emergencyOf(aircraft: Aircraft): Emergency | null {
  return aircraft.squawk === null ? null : (EMERGENCIES.get(aircraft.squawk) ?? null);
}

/** Aircraft in distress, most severe code first. */
export function findEmergencies(aircraft: readonly Aircraft[]): readonly Aircraft[] {
  return aircraft
    .filter((a) => emergencyOf(a) !== null)
    .sort((a, b) => (b.squawk ?? "").localeCompare(a.squawk ?? ""));
}
