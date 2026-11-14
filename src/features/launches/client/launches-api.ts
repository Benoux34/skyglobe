import {
  launchLibraryResponseSchema,
  toLaunch,
  upcomingLaunches,
  type Launch,
} from "../domain/launch";

/**
 * Launch Library 2 answers browsers directly, but allows only 15 anonymous
 * requests per hour and per visitor: one answer is reused for the session.
 */
const UPCOMING_URL =
  "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=15&mode=normal&hide_recent_previous=true";
const STORAGE_KEY = "skyglobe-launches";
const MAX_AGE_MS = 30 * 60 * 1000;

export class LaunchesRequestError extends Error {
  override readonly name = "LaunchesRequestError";
}

interface StoredAnswer {
  readonly fetchedAt: number;
  readonly payload: unknown;
}

function readStored(): StoredAnswer | null {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof stored !== "object" || stored === null) return null;
    if (!("fetchedAt" in stored) || !("payload" in stored)) return null;
    return typeof stored.fetchedAt === "number"
      ? { fetchedAt: stored.fetchedAt, payload: stored.payload }
      : null;
  } catch {
    return null;
  }
}

function store(payload: unknown): void {
  try {
    const answer: StoredAnswer = { fetchedAt: Date.now(), payload };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answer));
  } catch {
    // Storage full or disabled: the next visit simply asks again.
  }
}

function parseLaunches(payload: unknown): Launch[] | null {
  const parsed = launchLibraryResponseSchema.safeParse(payload);
  if (!parsed.success) return null;
  const launches = parsed.data.results.map(toLaunch).filter((launch) => launch !== null);
  return upcomingLaunches(launches, Date.now() / 1000);
}

export async function fetchUpcomingLaunches(signal: AbortSignal): Promise<Launch[]> {
  const stored = readStored();
  const fromStorage = stored === null ? null : parseLaunches(stored.payload);
  if (stored !== null && fromStorage !== null && Date.now() - stored.fetchedAt < MAX_AGE_MS) {
    return fromStorage;
  }

  let response: Response;
  try {
    response = await fetch(UPCOMING_URL, { signal });
  } catch (cause) {
    if (signal.aborted) throw cause;
    if (fromStorage !== null) return fromStorage;
    throw new LaunchesRequestError("Network error while loading launches.", { cause });
  }

  if (!response.ok) {
    // Typically the hourly limit: an older answer is still mostly right.
    if (fromStorage !== null) return fromStorage;
    throw new LaunchesRequestError(`Launch data request failed (${response.status}).`);
  }

  const payload: unknown = await response.json().catch(() => null);
  const launches = parseLaunches(payload);
  if (launches === null) {
    throw new LaunchesRequestError("Launch data arrived in an unexpected format.");
  }
  store(payload);
  return launches;
}
