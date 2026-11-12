import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const serverEnvSchema = z.object({
  OPENSKY_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  OPENSKY_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  FLIGHTS_REFRESH_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(10).optional(),
  ),
});

export interface OpenSkyCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface ServerEnv {
  readonly openSkyCredentials: OpenSkyCredentials | null;
  readonly flightsRefreshSeconds: number;
}

/** A global snapshot costs 4 OpenSky credits: 400/day anonymous, 4000/day authenticated. */
const ANONYMOUS_REFRESH_SECONDS = 900;
const AUTHENTICATED_REFRESH_SECONDS = 90;

function loadServerEnv(): ServerEnv {
  const env = serverEnvSchema.parse(process.env);
  const openSkyCredentials =
    env.OPENSKY_CLIENT_ID !== undefined && env.OPENSKY_CLIENT_SECRET !== undefined
      ? { clientId: env.OPENSKY_CLIENT_ID, clientSecret: env.OPENSKY_CLIENT_SECRET }
      : null;

  return {
    openSkyCredentials,
    flightsRefreshSeconds:
      env.FLIGHTS_REFRESH_SECONDS ??
      (openSkyCredentials === null ? ANONYMOUS_REFRESH_SECONDS : AUTHENTICATED_REFRESH_SECONDS),
  };
}

export const serverEnv: ServerEnv = loadServerEnv();
