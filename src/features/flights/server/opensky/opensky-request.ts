import "server-only";
import type { OpenSkyAccess } from "@/shared/config/server-env";
import { getOpenSkyAccessToken } from "./opensky-auth";

const API_URL = "https://opensky-network.org/api";

export type OpenSkyResource =
  { readonly kind: "states" } | { readonly kind: "track"; readonly icao24: string };

function directUrl(resource: OpenSkyResource): string {
  return resource.kind === "states"
    ? `${API_URL}/states/all`
    : `${API_URL}/tracks/all?icao24=${encodeURIComponent(resource.icao24)}&time=0`;
}

/** Routes of `relay/cloudflare-worker.js`. */
function relayUrl(baseUrl: string, resource: OpenSkyResource): string {
  return resource.kind === "states"
    ? `${baseUrl}/states`
    : `${baseUrl}/tracks?icao24=${encodeURIComponent(resource.icao24)}`;
}

/**
 * Asks OpenSky for a resource, either directly or through the relay. Both
 * answer with the same payload, so callers validate it the same way.
 */
export async function requestOpenSky(
  access: OpenSkyAccess,
  resource: OpenSkyResource,
  timeoutMs: number,
): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" });
  let url: string;

  if (access.kind === "relay") {
    url = relayUrl(access.url, resource);
    headers.set("Authorization", `Bearer ${access.token}`);
  } else {
    url = directUrl(resource);
    if (access.credentials !== null) {
      headers.set("Authorization", `Bearer ${await getOpenSkyAccessToken(access.credentials)}`);
    }
  }

  return fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
}
