import "server-only";
import type { OpenSkyCredentials } from "@/shared/config/server-env";
import type { Aircraft } from "../../domain/aircraft";
import { FlightsError } from "../flights-error";
import { getOpenSkyAccessToken } from "./opensky-auth";
import { openSkyStatesSchema, toAircraft } from "./opensky-schema";

const STATES_URL = "https://opensky-network.org/api/states/all";
const REQUEST_TIMEOUT_MS = 20_000;

export interface OpenSkySnapshot {
  readonly time: number;
  readonly aircraft: Aircraft[];
}

export async function fetchOpenSkySnapshot(
  credentials: OpenSkyCredentials | null,
): Promise<OpenSkySnapshot> {
  const headers = new Headers({ Accept: "application/json" });
  if (credentials !== null) {
    headers.set("Authorization", `Bearer ${await getOpenSkyAccessToken(credentials)}`);
  }

  let response: Response;
  try {
    response = await fetch(STATES_URL, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === "TimeoutError";
    throw new FlightsError(
      "upstream_unavailable",
      timedOut
        ? "OpenSky Network did not answer in time. It may be blocking this server's network."
        : "OpenSky Network could not be reached.",
      { cause },
    );
  }

  if (response.status === 429) {
    throw new FlightsError("rate_limited", "The OpenSky Network request quota is exhausted.");
  }
  if (!response.ok) {
    throw new FlightsError(
      "upstream_unavailable",
      `OpenSky Network responded with HTTP ${response.status}.`,
    );
  }

  // A block page served with HTTP 200 is not JSON; it then fails validation below.
  const parsed = openSkyStatesSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new FlightsError(
      "invalid_upstream_data",
      "OpenSky Network returned data in an unexpected format.",
      { cause: parsed.error },
    );
  }

  const aircraft: Aircraft[] = [];
  for (const state of parsed.data.states ?? []) {
    const converted = toAircraft(state);
    if (converted !== null) aircraft.push(converted);
  }
  return { time: parsed.data.time, aircraft };
}
