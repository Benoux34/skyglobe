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
  OPENSKY_RELAY_URL: z.preprocess(
    normalizeUrl,
    z
      .url({ error: "OPENSKY_RELAY_URL must look like https://name.account.workers.dev" })
      .optional(),
  ),
  OPENSKY_RELAY_TOKEN: optionalString,
  FLIGHTS_REFRESH_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(10).optional(),
  ),
});

export interface OpenSkyCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

/**
 * How this server reaches OpenSky. Hosts on the large cloud providers are
 * blocked by OpenSky and go through the relay, which holds the credentials.
 */
export type OpenSkyAccess =
  | { readonly kind: "direct"; readonly credentials: OpenSkyCredentials | null }
  | { readonly kind: "relay"; readonly url: string; readonly token: string };

export interface ServerEnv {
  readonly openSkyAccess: OpenSkyAccess;
  readonly flightsRefreshSeconds: number;
}

/** A global snapshot costs 4 OpenSky credits: 400/day anonymous, 4000/day authenticated. */
const ANONYMOUS_REFRESH_SECONDS = 900;
const AUTHENTICATED_REFRESH_SECONDS = 90;

function loadServerEnv(): ServerEnv {
  const env = serverEnvSchema.parse(process.env);

  let openSkyAccess: OpenSkyAccess;
  if (env.OPENSKY_RELAY_URL !== undefined && env.OPENSKY_RELAY_TOKEN !== undefined) {
    openSkyAccess = {
      kind: "relay",
      // The base address is expected; a pasted route (`…/states`) is cut back to it.
      url: env.OPENSKY_RELAY_URL.replace(/\/+$/, "").replace(/\/(states|tracks)$/, ""),
      token: env.OPENSKY_RELAY_TOKEN,
    };
  } else {
    const credentials =
      env.OPENSKY_CLIENT_ID !== undefined && env.OPENSKY_CLIENT_SECRET !== undefined
        ? { clientId: env.OPENSKY_CLIENT_ID, clientSecret: env.OPENSKY_CLIENT_SECRET }
        : null;
    openSkyAccess = { kind: "direct", credentials };
  }

  // The relay is expected to hold an OpenSky account, like an authenticated direct access.
  const anonymous = openSkyAccess.kind === "direct" && openSkyAccess.credentials === null;

  return {
    openSkyAccess,
    flightsRefreshSeconds:
      env.FLIGHTS_REFRESH_SECONDS ??
      (anonymous ? ANONYMOUS_REFRESH_SECONDS : AUTHENTICATED_REFRESH_SECONDS),
  };
}

export const serverEnv: ServerEnv = loadServerEnv();
