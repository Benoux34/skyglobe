import "server-only";
import { z } from "zod";
import type { OpenSkyCredentials } from "@/shared/config/server-env";
import { FlightsError } from "../flights-error";

const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const EXPIRY_MARGIN_MS = 30_000;

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});

interface CachedToken {
  readonly value: string;
  readonly expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/** OAuth2 client-credentials token, cached in memory until shortly before it expires. */
export async function getOpenSkyAccessToken(credentials: OpenSkyCredentials): Promise<string> {
  if (cachedToken !== null && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new FlightsError(
      "upstream_unavailable",
      `OpenSky authentication failed (HTTP ${response.status}).`,
    );
  }

  const token = tokenResponseSchema.parse(await response.json());
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000 - EXPIRY_MARGIN_MS,
  };
  return cachedToken.value;
}
