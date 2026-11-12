"use client";

import { useEffect } from "react";
import { useFlightsStore } from "../store/flights-store";
import { selectSelectedAircraft } from "../store/selectors";
import { fetchFlightDetails } from "./flight-details-api";

/** Loads the route, track and airframe of whichever aircraft is selected and publishes it to the store. */
export function useSelectedFlightDetails(): void {
  const icao24 = useFlightsStore((state) => state.selectedId);
  const callsign = useFlightsStore((state) => selectSelectedAircraft(state)?.callsign ?? null);

  useEffect(() => {
    const { detailsRequested, detailsLoaded, detailsFailed, detailsCleared } =
      useFlightsStore.getState();
    if (icao24 === null) {
      detailsCleared();
      return;
    }

    const controller = new AbortController();
    detailsRequested(icao24);
    fetchFlightDetails(icao24, callsign, controller.signal).then(
      (details) => detailsLoaded(icao24, details),
      () => {
        if (!controller.signal.aborted) detailsFailed(icao24);
      },
    );
    return () => controller.abort();
  }, [icao24, callsign]);
}
