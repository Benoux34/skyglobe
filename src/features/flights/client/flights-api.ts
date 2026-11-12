import {
  decodeSnapshot,
  flightsErrorDtoSchema,
  flightsSnapshotDtoSchema,
  type FlightsSnapshot,
} from "../domain/snapshot";

export class FlightsRequestError extends Error {
  override readonly name = "FlightsRequestError";
}

export async function fetchFlightsSnapshot(signal: AbortSignal): Promise<FlightsSnapshot> {
  let response: Response;
  try {
    response = await fetch("/api/flights", { signal });
  } catch (cause) {
    if (signal.aborted) throw cause;
    throw new FlightsRequestError("Network error while loading flights.", { cause });
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = flightsErrorDtoSchema.safeParse(payload);
    throw new FlightsRequestError(
      error.success ? error.data.error.message : `Flight data request failed (${response.status}).`,
    );
  }

  const snapshot = flightsSnapshotDtoSchema.safeParse(payload);
  if (!snapshot.success) {
    throw new FlightsRequestError("Flight data arrived in an unexpected format.", {
      cause: snapshot.error,
    });
  }
  return decodeSnapshot(snapshot.data);
}
