import "server-only";
import type { FlightsErrorCode } from "../domain/snapshot";

export class FlightsError extends Error {
  override readonly name = "FlightsError";

  constructor(
    readonly code: FlightsErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
