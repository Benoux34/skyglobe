"use client";

import { useState } from "react";
import type { Airframe } from "@/features/flights/domain/flight-details";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectSelectedFlightDetails } from "@/features/flights/store/selectors";

const PHOTO_CREDIT_URL = "https://www.airport-data.com";

/** Photo, model and registration of the selected aircraft, when known. */
export function AirframeSummary() {
  const airframe = useFlightsStore((state) => selectSelectedFlightDetails(state)?.airframe ?? null);
  if (airframe === null) return null;

  const model = [airframe.manufacturer, airframe.model].filter((part) => part !== null).join(" ");
  const facts = [airframe.registration, airframe.typeCode, airframe.owner].filter(
    (part) => part !== null,
  );
  if (airframe.photoUrl === null && model === "" && facts.length === 0) return null;

  return (
    <div className="border-line border-t">
      {airframe.photoUrl !== null && (
        // Keyed by URL so a failed load on one aircraft does not hide the next one's photo.
        <AirframePhoto key={airframe.photoUrl} url={airframe.photoUrl} airframe={airframe} />
      )}
      {(model !== "" || facts.length > 0) && (
        <div className="px-4 py-3">
          {model !== "" && <p className="text-fg text-sm font-medium">{model}</p>}
          {facts.length > 0 && <p className="text-muted mt-0.5 text-xs">{facts.join(" · ")}</p>}
        </div>
      )}
    </div>
  );
}

interface AirframePhotoProps {
  readonly url: string;
  readonly airframe: Airframe;
}

function AirframePhoto({ url, airframe }: AirframePhotoProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const subject = airframe.registration ?? airframe.model ?? "the aircraft";
  return (
    <figure className="bg-inset relative aspect-[16/9] overflow-hidden">
      {/* Remote third-party photo: next/image would proxy it through the image optimizer for no benefit. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Photo of ${subject}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
      <figcaption className="absolute right-1.5 bottom-1.5">
        <a
          href={PHOTO_CREDIT_URL}
          target="_blank"
          rel="noreferrer"
          className="bg-surface/80 text-muted hover:text-fg rounded px-1.5 py-0.5 text-[10px]"
        >
          Photo: airport-data.com
        </a>
      </figcaption>
    </figure>
  );
}
