"use client";

import dynamic from "next/dynamic";
import { useSelectedFlightDetails } from "@/features/flights/client/use-selected-flight-details";
import { useFlightsPolling } from "@/features/flights/client/use-flights-polling";
import { Hud } from "@/features/hud/components/Hud";
import { useLaunchesLoader } from "@/features/launches/client/use-launches-loader";
import { useSatellitesLoader } from "@/features/satellites/client/use-satellites-loader";
import { useShipsPolling } from "@/features/ships/client/use-ships-polling";

// WebGL cannot render on the server, so the canvas is loaded in the browser only.
const GlobeCanvas = dynamic(() => import("@/features/globe/components/GlobeCanvas"), {
  ssr: false,
});

/** Composition root: wires the data feed, the 3D globe and the HUD together. */
export function FlightRadar() {
  useFlightsPolling();
  useSelectedFlightDetails();
  useSatellitesLoader();
  useLaunchesLoader();
  useShipsPolling();

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-background">
      <GlobeCanvas />
      <Hud />
    </main>
  );
}
