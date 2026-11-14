import { connection } from "next/server";
import type { ShipsErrorDto } from "@/features/ships/domain/ship";
import { getShipsSnapshot } from "@/features/ships/server/ships-service";

const secondsUntil = (unixSeconds: number): number =>
  Math.max(1, Math.ceil(unixSeconds - Date.now() / 1000));

export async function GET(): Promise<Response> {
  // Live data: never evaluate this handler while prerendering at build time.
  await connection();
  const result = await getShipsSnapshot();

  if (!result.ok) {
    const body: ShipsErrorDto = { error: { code: result.code, message: result.message } };
    return Response.json(body, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(secondsUntil(result.retryAt)),
      },
    });
  }

  const maxAge = secondsUntil(result.snapshot.nextRefreshAt);
  return Response.json(result.snapshot, {
    headers: {
      // Shared CDN cache: every visitor reuses the same download.
      "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=30`,
    },
  });
}
