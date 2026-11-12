/**
 * SkyGlobe relay: a Cloudflare Worker that queries OpenSky on behalf of the app.
 *
 * OpenSky drops connections coming from the large cloud providers the app is
 * hosted on, so the app calls this Worker instead and the Worker calls OpenSky.
 *
 * Variables to set on the Worker (Settings > Variables and Secrets):
 *   RELAY_TOKEN            required  shared secret; the app sends it as a Bearer token
 *   OPENSKY_CLIENT_ID      optional  OpenSky API client, for the higher quota
 *   OPENSKY_CLIENT_SECRET  optional
 *
 * Routes:
 *   GET /states                 every aircraft currently tracked
 *   GET /tracks?icao24=abc123   path flown so far by one aircraft
 */

const API_URL = "https://opensky-network.org/api";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const ICAO24_PATTERN = /^[0-9a-f]{6}$/;
const EXPIRY_MARGIN_MS = 30_000;
const TOKEN_TIMEOUT_MS = 10_000;
const UPSTREAM_TIMEOUT_MS = 25_000;

/** OAuth token kept for as long as this Worker instance stays warm. */
let cachedToken = null;

const json = (status, message) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function getAccessToken(env) {
  if (cachedToken !== null && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.OPENSKY_CLIENT_ID,
      client_secret: env.OPENSKY_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenSky authentication failed (HTTP ${response.status}).`);

  const token = await response.json();
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000 - EXPIRY_MARGIN_MS,
  };
  return cachedToken.value;
}

function upstreamUrl(url) {
  if (url.pathname === "/states") return `${API_URL}/states/all`;
  if (url.pathname === "/tracks") {
    const icao24 = url.searchParams.get("icao24") ?? "";
    return ICAO24_PATTERN.test(icao24) ? `${API_URL}/tracks/all?icao24=${icao24}&time=0` : null;
  }
  return null;
}

const worker = {
  async fetch(request, env) {
    if (!env.RELAY_TOKEN) return json(500, "RELAY_TOKEN is not configured on the relay.");
    if (request.headers.get("Authorization") !== `Bearer ${env.RELAY_TOKEN}`) {
      return json(401, "Missing or wrong relay token.");
    }
    if (request.method !== "GET") return json(405, "Only GET is supported.");

    const target = upstreamUrl(new URL(request.url));
    if (target === null) return json(404, "Unknown relay route.");

    try {
      const headers = { Accept: "application/json" };
      if (env.OPENSKY_CLIENT_ID && env.OPENSKY_CLIENT_SECRET) {
        headers.Authorization = `Bearer ${await getAccessToken(env)}`;
      }
      const upstream = await fetch(target, {
        headers,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
      return json(502, `The relay could not reach OpenSky (${reason}).`);
    }
  },
};

export default worker;
