import "server-only";
import { serverEnv } from "@/shared/config/server-env";
import {
  shipsSnapshotFileSchema,
  type ShipsErrorCode,
  type ShipsSnapshotDto,
} from "../domain/ship";

/** Re-reading the published file is free; this only bounds how late a new one is noticed. */
const REFRESH_SECONDS = 60;
/** After a failed refresh, wait this long before asking again. */
const FAILURE_BACKOFF_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 20_000;

export type ShipsResult =
  | { readonly ok: true; readonly snapshot: ShipsSnapshotDto }
  | {
      readonly ok: false;
      readonly code: ShipsErrorCode;
      readonly message: string;
      readonly retryAt: number;
    };

const nowSeconds = (): number => Date.now() / 1000;

/** Per-instance memory cache; on Vercel the CDN cache set by the route comes first. */
let cached: ShipsSnapshotDto | null = null;
let retryAt = 0;
let lastFailure = "Ship data is temporarily unavailable.";
let inFlight: Promise<ShipsResult> | null = null;

async function download(url: string): Promise<ShipsSnapshotDto> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) throw new Error("The ships snapshot has not been published yet.");
  if (!response.ok) throw new Error(`The ships snapshot answered with HTTP ${response.status}.`);

  const file = shipsSnapshotFileSchema.safeParse(await response.json());
  if (!file.success) throw new Error("The ships snapshot is in an unexpected format.");
  return { ...file.data, nextRefreshAt: nowSeconds() + REFRESH_SECONDS };
}

async function refresh(url: string): Promise<ShipsResult> {
  try {
    cached = await download(url);
    return { ok: true, snapshot: cached };
  } catch (cause) {
    lastFailure = cause instanceof Error ? cause.message : "Ship data could not be loaded.";
    console.error(`[ships] refresh failed: ${lastFailure}`);
    retryAt = nowSeconds() + FAILURE_BACKOFF_SECONDS;

    // Ships barely move in a few minutes: the previous snapshot is still a good picture.
    if (cached !== null) {
      cached = { ...cached, nextRefreshAt: retryAt };
      return { ok: true, snapshot: cached };
    }
    return { ok: false, code: "upstream_unavailable", message: lastFailure, retryAt };
  }
}

export async function getShipsSnapshot(): Promise<ShipsResult> {
  const url = serverEnv.shipsSnapshotUrl;
  const now = nowSeconds();
  if (url === null) {
    return {
      ok: false,
      code: "not_configured",
      message: "Ship data is not set up on this server.",
      retryAt: now + FAILURE_BACKOFF_SECONDS,
    };
  }
  if (cached !== null && cached.nextRefreshAt > now) return { ok: true, snapshot: cached };
  if (cached === null && retryAt > now) {
    return { ok: false, code: "upstream_unavailable", message: lastFailure, retryAt };
  }

  inFlight ??= refresh(url).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
