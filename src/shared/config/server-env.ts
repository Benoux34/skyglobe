import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

/** Forgives the usual copy-paste slips: stray quotes or spaces, and a missing `https://`. */
function normalizeUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  if (trimmed === "") return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const serverEnvSchema = z.object({
  OPENSKY_CLIENT_ID: optionalString,
  OPENSKY_CLIENT_SECRET: optionalString,
  FLIGHTS_SNAPSHOT_URL: z.preprocess(
    normalizeUrl,
    z
      .url({ error: "FLIGHTS_SNAPSHOT_URL must be the address of the published snapshot" })
      .optional(),
  ),
  SHIPS_SNAPSHOT_URL: z.preprocess(
    normalizeUrl,
    z.url({ error: "SHIPS_SNAPSHOT_URL must be the address of the published snapshot" }).optional(),
  ),
  FLIGHTS_REFRESH_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(10).optional(),
  ),
});

export interface OpenSkyCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

/** Calls OpenSky itself. Works from a home or office network. */
export interface DirectOpenSkyAccess {
  readonly kind: "direct";
  readonly credentials: OpenSkyCredentials | null;
}

/**
 * Reads the snapshot that the "Publish flights" GitHub workflow uploads. For
 * hosts on the large clouds, whose connections OpenSky ignores.
 */
export interface PublishedSnapshotAccess {
  readonly kind: "snapshot";
  readonly url: string;
}

export type OpenSkyAccess = DirectOpenSkyAccess | PublishedSnapshotAccess;

export interface ServerEnv {
  readonly openSkyAccess: OpenSkyAccess;
  readonly flightsRefreshSeconds: number;
  /** Where the "Publish ships" GitHub workflow uploads its snapshot; `null` turns ships off. */
  readonly shipsSnapshotUrl: string | null;
}

/** A global snapshot costs 4 OpenSky credits: 400/day anonymous, 4000/day authenticated. */
const ANONYMOUS_REFRESH_SECONDS = 900;
const AUTHENTICATED_REFRESH_SECONDS = 90;
/** Re-reading the published file is free; this only bounds how late a new one is noticed. */
const SNAPSHOT_REFRESH_SECONDS = 60;

function defaultRefreshSeconds(access: OpenSkyAccess): number {
  if (access.kind === "snapshot") return SNAPSHOT_REFRESH_SECONDS;
  return access.credentials === null ? ANONYMOUS_REFRESH_SECONDS : AUTHENTICATED_REFRESH_SECONDS;
}

function loadServerEnv(): ServerEnv {
  const env = serverEnvSchema.parse(process.env);

  const openSkyAccess: OpenSkyAccess =
    env.FLIGHTS_SNAPSHOT_URL !== undefined
      ? { kind: "snapshot", url: env.FLIGHTS_SNAPSHOT_URL }
      : {
          kind: "direct",
          credentials:
            env.OPENSKY_CLIENT_ID !== undefined && env.OPENSKY_CLIENT_SECRET !== undefined
              ? { clientId: env.OPENSKY_CLIENT_ID, clientSecret: env.OPENSKY_CLIENT_SECRET }
              : null,
        };

  return {
    openSkyAccess,
    flightsRefreshSeconds: env.FLIGHTS_REFRESH_SECONDS ?? defaultRefreshSeconds(openSkyAccess),
    shipsSnapshotUrl: env.SHIPS_SNAPSHOT_URL ?? null,
  };
}

export const serverEnv: ServerEnv = loadServerEnv();
