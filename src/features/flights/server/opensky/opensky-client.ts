import "server-only";
import type { OpenSkyAccess } from "@/shared/config/server-env";
import type { Aircraft } from "../../domain/aircraft";
import { FlightsError } from "../flights-error";
import { requestOpenSky } from "./opensky-request";
import { openSkyStatesSchema, toAircraft } from "./opensky-schema";

/** Above the relay's own 25 s limit, so its explanation arrives before this one fires. */
const REQUEST_TIMEOUT_MS = 28_000;
const ERROR_DETAIL_LENGTH = 200;

export interface OpenSkySnapshot {
  readonly time: number;
  readonly aircraft: Aircraft[];
}

export async function fetchOpenSkySnapshot(access: OpenSkyAccess): Promise<OpenSkySnapshot> {
  let response: Response;
  try {
    response = await requestOpenSky(access, { kind: "states" }, REQUEST_TIMEOUT_MS);
  } catch (cause) {
    // Signing in to OpenSky already explains its own failures.
    if (cause instanceof FlightsError) throw cause;
    const timedOut = cause instanceof Error && cause.name === "TimeoutError";
    throw new FlightsError(
      "upstream_unavailable",
      timedOut
        ? "OpenSky Network did not answer in time. It may be blocking this server's network."
        : "OpenSky Network could not be reached.",
      { cause },
    );
  }

  if (response.status === 429) {
    throw new FlightsError("rate_limited", "The OpenSky Network request quota is exhausted.");
  }
  if (!response.ok) {
    // The relay explains its failures in the body; OpenSky's own error pages are cut short.
    const detail = (await response.text().catch(() => "")).trim().slice(0, ERROR_DETAIL_LENGTH);
    throw new FlightsError(
      "upstream_unavailable",
      `OpenSky Network responded with HTTP ${response.status}${detail === "" ? "" : `: ${detail}`}.`,
    );
  }

  // A block page served with HTTP 200 is not JSON; it then fails validation below.
  const parsed = openSkyStatesSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new FlightsError(
      "invalid_upstream_data",
      "OpenSky Network returned data in an unexpected format.",
      { cause: parsed.error },
    );
  }

  const aircraft: Aircraft[] = [];
  for (const state of parsed.data.states ?? []) {
    const converted = toAircraft(state);
    if (converted !== null) aircraft.push(converted);
  }
  return { time: parsed.data.time, aircraft };
}
