import {
  decodeShipsSnapshot,
  shipsErrorDtoSchema,
  shipsSnapshotDtoSchema,
  type ShipsSnapshot,
} from "../domain/ship";

export class ShipsRequestError extends Error {
  override readonly name = "ShipsRequestError";
}

export async function fetchShipsSnapshot(signal: AbortSignal): Promise<ShipsSnapshot> {
  let response: Response;
  try {
    response = await fetch("/api/ships", { signal });
  } catch (cause) {
    if (signal.aborted) throw cause;
    throw new ShipsRequestError("Network error while loading ships.", { cause });
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = shipsErrorDtoSchema.safeParse(payload);
    throw new ShipsRequestError(
      error.success ? error.data.error.message : `Ship data request failed (${response.status}).`,
    );
  }

  const snapshot = shipsSnapshotDtoSchema.safeParse(payload);
  if (!snapshot.success) {
    throw new ShipsRequestError("Ship data arrived in an unexpected format.", {
      cause: snapshot.error,
    });
  }
  return decodeShipsSnapshot(snapshot.data);
}
