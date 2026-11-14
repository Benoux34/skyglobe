import { buildCatalog, type SatelliteRecord } from "../domain/satellite";

/**
 * CelesTrak serves orbital elements to browsers directly. It asks clients not
 * to download a list again within two hours, so answers are kept in the
 * browser's cache storage and reused for a few hours.
 */
const CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php";
const CACHE_NAME = "skyglobe-satellites";
const FETCHED_AT_HEADER = "x-fetched-at";
/** Elements drift slowly: a few hours old is still accurate to a few kilometres. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const groupUrl = (group: string): string => `${CELESTRAK_URL}?GROUP=${group}&FORMAT=tle`;

export class SatellitesRequestError extends Error {
  override readonly name = "SatellitesRequestError";
}

async function openCache(): Promise<Cache | null> {
  try {
    return "caches" in globalThis ? await caches.open(CACHE_NAME) : null;
  } catch {
    // Cache storage is unavailable in some private browsing modes.
    return null;
  }
}

async function fetchElements(url: string, signal: AbortSignal): Promise<string> {
  const cache = await openCache();
  const cached = (await cache?.match(url)) ?? null;
  if (cached !== null) {
    const fetchedAt = Number(cached.headers.get(FETCHED_AT_HEADER));
    if (Date.now() - fetchedAt < MAX_AGE_MS) return cached.text();
  }

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (cause) {
    if (signal.aborted) throw cause;
    if (cached !== null) return cached.text();
    throw new SatellitesRequestError("Network error while loading satellites.", { cause });
  }

  if (!response.ok) {
    // CelesTrak refuses repeated downloads; an older copy is then good enough.
    if (cached !== null) return cached.text();
    throw new SatellitesRequestError(`Satellite data request failed (${response.status}).`);
  }

  const text = await response.text();
  await cache
    ?.put(url, new Response(text, { headers: { [FETCHED_AT_HEADER]: String(Date.now()) } }))
    .catch(() => undefined);
  return text;
}

export async function fetchSatelliteCatalog(signal: AbortSignal): Promise<SatelliteRecord[]> {
  const [active, navigation] = await Promise.all([
    fetchElements(groupUrl("active"), signal),
    fetchElements(groupUrl("gnss"), signal),
  ]);

  const catalog = buildCatalog(active, navigation);
  if (catalog.length === 0) {
    throw new SatellitesRequestError("Satellite data arrived in an unexpected format.");
  }
  return catalog;
}
