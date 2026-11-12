import "server-only";
import { z } from "zod";
import type { Airframe } from "../../domain/flight-details";

const AIRCRAFT_URL = "https://api.adsbdb.com/v0/aircraft";

/** adsbdb serves photos from airport-data.com; anything else is not passed on to browsers. */
const PHOTO_HOSTS: ReadonlySet<string> = new Set(["image.airport-data.com", "airport-data.com"]);

const adsbdbAircraftSchema = z.object({
  response: z.object({
    aircraft: z.object({
      type: z.string().nullish(),
      icao_type: z.string().nullish(),
      manufacturer: z.string().nullish(),
      registration: z.string().nullish(),
      registered_owner: z.string().nullish(),
      url_photo: z.string().nullish(),
    }),
  }),
});

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === "" ? null : value.trim();

function trustedPhotoUrl(value: string | null | undefined): string | null {
  if (value === undefined || value === null || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" && PHOTO_HOSTS.has(url.hostname) ? url.href : null;
}

/** Model, registration and photo of the aircraft with this transponder address, if known. */
export async function fetchAdsbdbAirframe(icao24: string): Promise<Airframe | null> {
  const response = await fetch(`${AIRCRAFT_URL}/${encodeURIComponent(icao24)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const parsed = adsbdbAircraftSchema.safeParse(await response.json());
  if (!parsed.success) return null;

  const { aircraft } = parsed.data.response;
  return {
    model: emptyToNull(aircraft.type),
    manufacturer: emptyToNull(aircraft.manufacturer),
    typeCode: emptyToNull(aircraft.icao_type),
    registration: emptyToNull(aircraft.registration),
    owner: emptyToNull(aircraft.registered_owner),
    photoUrl: trustedPhotoUrl(aircraft.url_photo),
  };
}
