"use client";

import { useEffect } from "react";
import { useLayersStore } from "@/features/layers/layers-store";
import { useLaunchesStore } from "../store/launches-store";
import { fetchUpcomingLaunches } from "./launches-api";

/** Downloads the upcoming launches the first time the layer is shown. */
export function useLaunchesLoader(): void {
  const enabled = useLayersStore((state) => state.visible.launches);
  const status = useLaunchesStore((state) => state.status);
  const needed = enabled && status === "idle";

  useEffect(() => {
    if (!needed) return;
    const { status, launchesRequested, launchesLoaded, launchesFailed } =
      useLaunchesStore.getState();
    // The store is the source of truth: an effect replayed by React must not download twice.
    if (status !== "idle") return;

    launchesRequested();
    // Never aborted: the request must outlive the status change it triggers itself.
    fetchUpcomingLaunches(new AbortController().signal).then(launchesLoaded, (error: unknown) => {
      console.error("[launches]", error);
      launchesFailed();
    });
  }, [needed]);
}
