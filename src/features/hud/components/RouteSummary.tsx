"use client";

import { ArrowRight } from "lucide-react";
import { airportCode, type Airport } from "@/features/flights/domain/flight-details";
import { useFlightsStore } from "@/features/flights/store/flights-store";

/** Origin and destination of the selected aircraft, when its route is known. */
export function RouteSummary() {
  const details = useFlightsStore((state) => state.details);

  if (details.status === "idle") return null;
  if (details.status === "loading") return <Note>Looking up the route…</Note>;
  if (details.status === "error") return <Note>The route could not be loaded.</Note>;

  const { route, track } = details.details;
  if (route === null) {
    return (
      <Note>
        {track === null
          ? "No route or track is known for this aircraft."
          : "Route unknown. The track flown so far is drawn on the globe."}
      </Note>
    );
  }

  return (
    <div className="border-line border-t px-4 py-3">
      <div className="flex items-center gap-3">
        <AirportBlock airport={route.origin} align="left" />
        <ArrowRight className="text-subtle size-4 shrink-0" aria-hidden />
        <AirportBlock airport={route.destination} align="right" />
      </div>
      {route.airline !== null && <p className="text-muted mt-2 text-xs">{route.airline}</p>}
      {track === null && (
        <p className="text-subtle mt-1 text-xs">
          Path so far estimated as a direct line from {airportCode(route.origin)}.
        </p>
      )}
    </div>
  );
}

interface AirportBlockProps {
  readonly airport: Airport;
  readonly align: "left" | "right";
}

function AirportBlock({ airport, align }: AirportBlockProps) {
  return (
    <div className={`min-w-0 flex-1 ${align === "right" ? "text-right" : ""}`} title={airport.name}>
      <p className="text-fg font-mono text-lg leading-tight font-semibold">
        {airportCode(airport)}
      </p>
      <p className="text-muted truncate text-xs">{airport.city ?? airport.name}</p>
    </div>
  );
}

function Note({ children }: { readonly children: React.ReactNode }) {
  return <p className="border-line text-muted border-t px-4 py-3 text-xs">{children}</p>;
}
