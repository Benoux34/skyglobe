"use client";

import { useEffect } from "react";
import { useLayersStore } from "@/features/layers/layers-store";
import { useSatellitesStore } from "../store/satellites-store";
import { fetchSatelliteCatalog } from "./satellites-api";

/** Downloads the satellite catalogue the first time the layer, or anything else, needs it. */
export function useSatellitesLoader(): void {
  const enabled = useLayersStore((state) => state.visible.satellites);
  const requested = useSatellitesStore((state) => state.requested);
  const status = useSatellitesStore((state) => state.status);
  const needed = (enabled || requested) && status === "idle";

  useEffect(() => {
    if (!needed) return;
    const { status, catalogRequested, catalogLoaded, catalogFailed } =
      useSatellitesStore.getState();
    // The store is the source of truth: an effect replayed by React must not download twice.
    if (status !== "idle") return;

    catalogRequested();
    // Never aborted: the request must outlive the status change it triggers itself.
    fetchSatelliteCatalog(new AbortController().signal).then(catalogLoaded, (error: unknown) => {
      console.error("[satellites]", error);
      catalogFailed();
    });
  }, [needed]);
}
