import { connection } from "next/server";
import {
  encodeSnapshot,
  type FlightsErrorDto,
  type FlightsSnapshotDto,
} from "@/features/flights/domain/snapshot";
import { getFlightsSnapshot } from "@/features/flights/server/flights-service";

const secondsUntil = (unixSeconds: number): number =>
  Math.max(1, Math.ceil(unixSeconds - Date.now() / 1000));

export async function GET(): Promise<Response> {
  // Live data: never evaluate this handler while prerendering at build time.
  await connection();
  const result = await getFlightsSnapshot();

  if (!result.ok) {
    const body: FlightsErrorDto = {
      error: { code: result.error.code, message: result.error.message },
    };
    return Response.json(body, {
      status: result.error.code === "rate_limited" ? 429 : 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(secondsUntil(result.retryAt)),
      },
    });
  }

  const body: FlightsSnapshotDto = encodeSnapshot(result.snapshot);
  const maxAge = secondsUntil(result.snapshot.nextRefreshAt);
  return Response.json(body, {
    headers: {
      // Shared CDN cache: every visitor reuses the same upstream call.
      "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=30`,
    },
  });
}
