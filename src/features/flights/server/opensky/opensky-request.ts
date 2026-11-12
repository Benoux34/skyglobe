import "server-only";
import type { DirectOpenSkyAccess, OpenSkyAccess } from "@/shared/config/server-env";
import { getOpenSkyAccessToken } from "./opensky-auth";

const API_URL = "https://opensky-network.org/api";

async function requestApi(
  access: DirectOpenSkyAccess,
  path: string,
  timeoutMs: number,
): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" });
  if (access.credentials !== null) {
    headers.set("Authorization", `Bearer ${await getOpenSkyAccessToken(access.credentials)}`);
  }
  return fetch(`${API_URL}${path}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/**
 * Every tracked aircraft, from OpenSky itself or from the published copy of
 * its answer. Both have the same payload, so callers validate it the same way.
 */
export function requestStates(access: OpenSkyAccess, timeoutMs: number): Promise<Response> {
  if (access.kind === "snapshot") {
    return fetch(access.url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  }
  return requestApi(access, "/states/all", timeoutMs);
}

/** Path flown so far by one aircraft. Only OpenSky itself can answer this. */
export function requestTrack(
  access: DirectOpenSkyAccess,
  icao24: string,
  timeoutMs: number,
): Promise<Response> {
  return requestApi(access, `/tracks/all?icao24=${encodeURIComponent(icao24)}&time=0`, timeoutMs);
}
