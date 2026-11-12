import "server-only";
import { serverEnv } from "@/shared/config/server-env";
import type { FlightsSnapshot } from "../domain/snapshot";
import { FlightsError } from "./flights-error";
import { fetchOpenSkySnapshot } from "./opensky/opensky-client";

/** After a failed refresh, wait this long before hitting the upstream again. */
const FAILURE_BACKOFF_SECONDS = 60;

export type FlightsResult =
  | { readonly ok: true; readonly snapshot: FlightsSnapshot }
  | { readonly ok: false; readonly error: FlightsError; readonly retryAt: number };

const nowSeconds = (): number => Date.now() / 1000;

/**
 * Per-instance memory cache in front of OpenSky. On Vercel the CDN cache
 * (see the route's Cache-Control) is the primary shield; this one protects
 * the quota during local development and within a warm function instance.
 */
let cached: FlightsSnapshot | null = null;
let retryAt = 0;
/** Why the latest refresh failed; repeated while backing off so the cause stays visible. */
let lastError: FlightsError | null = null;
let inFlight: Promise<FlightsResult> | null = null;

async function refresh(): Promise<FlightsResult> {
  try {
    const { time, aircraft } = await fetchOpenSkySnapshot(serverEnv.openSkyCredentials);
    cached = {
      time,
      aircraft,
      nextRefreshAt: nowSeconds() + serverEnv.flightsRefreshSeconds,
    };
    return { ok: true, snapshot: cached };
  } catch (cause) {
    const error =
      cause instanceof FlightsError
        ? cause
        : new FlightsError("upstream_unavailable", "Unexpected error while loading flights.", {
            cause,
          });
    console.error(`[flights] refresh failed: ${error.code} ${error.message}`);
    retryAt = nowSeconds() + FAILURE_BACKOFF_SECONDS;
    lastError = error;

    // Stale positions beat no positions: the client keeps extrapolating them.
    if (cached !== null) {
      cached = { ...cached, nextRefreshAt: retryAt };
      return { ok: true, snapshot: cached };
    }
    return { ok: false, error, retryAt };
  }
}

export async function getFlightsSnapshot(): Promise<FlightsResult> {
  const now = nowSeconds();
  if (cached !== null && cached.nextRefreshAt > now) return { ok: true, snapshot: cached };
  if (cached === null && retryAt > now) {
    return {
      ok: false,
      error:
        lastError ??
        new FlightsError("upstream_unavailable", "Flight data is temporarily unavailable."),
      retryAt,
    };
  }

  inFlight ??= refresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
