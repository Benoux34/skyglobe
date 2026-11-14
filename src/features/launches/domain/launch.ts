import { z } from "zod";

export interface LaunchPad {
  readonly name: string;
  /** Launch site, e.g. "Cape Canaveral SFS, FL, USA". */
  readonly location: string | null;
  readonly latitude: number;
  readonly longitude: number;
}

/** An upcoming rocket launch. */
export interface Launch {
  readonly id: string;
  readonly rocket: string;
  readonly mission: string | null;
  readonly provider: string | null;
  /** Short name of the orbit aimed for, e.g. "LEO", "SSO", "GTO". */
  readonly orbit: string | null;
  /** Short readiness label, e.g. "Go", "TBC", "TBD". */
  readonly status: string | null;
  readonly statusDescription: string | null;
  /** Planned lift-off, in Unix seconds. */
  readonly liftoffTime: number;
  readonly pad: LaunchPad | null;
}

export type LaunchId = Launch["id"];

const coordinateSchema = z.union([z.number(), z.string()]).nullish();
const namedSchema = z.object({ name: z.string() }).nullish();

/** The fields used from Launch Library 2 (`/launches/upcoming`). */
export const launchLibraryResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      net: z.string().nullish(),
      status: z.object({ abbrev: z.string().nullish(), name: z.string().nullish() }).nullish(),
      launch_service_provider: namedSchema,
      rocket: z.object({ configuration: namedSchema }).nullish(),
      mission: z
        .object({
          name: z.string(),
          orbit: z.object({ abbrev: z.string().nullish() }).nullish(),
        })
        .nullish(),
      pad: z
        .object({
          name: z.string(),
          latitude: coordinateSchema,
          longitude: coordinateSchema,
          location: namedSchema,
        })
        .nullish(),
    }),
  ),
});

type LaunchLibraryLaunch = z.infer<typeof launchLibraryResponseSchema>["results"][number];

const toCoordinate = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

function toPad(pad: LaunchLibraryLaunch["pad"]): LaunchPad | null {
  if (pad === null || pad === undefined) return null;
  const latitude = toCoordinate(pad.latitude);
  const longitude = toCoordinate(pad.longitude);
  if (latitude === null || longitude === null) return null;
  return { name: pad.name, location: pad.location?.name ?? null, latitude, longitude };
}

/** `null` when the launch has no usable date. */
export function toLaunch(raw: LaunchLibraryLaunch): Launch | null {
  const liftoffMs = raw.net === null || raw.net === undefined ? Number.NaN : Date.parse(raw.net);
  if (!Number.isFinite(liftoffMs)) return null;

  // Launch Library names launches "Rocket | Mission".
  const [rocketFromName, missionFromName] = raw.name.split("|").map((part) => part.trim());
  return {
    id: raw.id,
    rocket: raw.rocket?.configuration?.name ?? rocketFromName ?? raw.name,
    mission: raw.mission?.name ?? missionFromName ?? null,
    provider: raw.launch_service_provider?.name ?? null,
    orbit: raw.mission?.orbit?.abbrev ?? null,
    status: raw.status?.abbrev ?? null,
    statusDescription: raw.status?.name ?? null,
    liftoffTime: liftoffMs / 1000,
    pad: toPad(raw.pad),
  };
}

/** A launch stays listed for a while after lift-off, to watch the ascent. */
const KEPT_AFTER_LIFTOFF_SECONDS = 2 * 3600;

/** Launches still worth showing at `nowSeconds`, soonest first. */
export function upcomingLaunches(launches: readonly Launch[], nowSeconds: number): Launch[] {
  return launches
    .filter((launch) => launch.liftoffTime > nowSeconds - KEPT_AFTER_LIFTOFF_SECONDS)
    .sort((a, b) => a.liftoffTime - b.liftoffTime);
}

const pad2 = (value: number): string => value.toString().padStart(2, "0");

/** Mission clock: "T−3d 04h", "T−02:15:09", then "T+00:01:30" once it has lifted off. */
export function formatCountdown(secondsToLiftoff: number): string {
  const sign = secondsToLiftoff > 0 ? "−" : "+";
  const total = Math.floor(Math.abs(secondsToLiftoff));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  if (days > 0) return `T${sign}${days}d ${pad2(hours)}h`;
  return `T${sign}${pad2(hours)}:${pad2(Math.floor((total % 3600) / 60))}:${pad2(total % 60)}`;
}
