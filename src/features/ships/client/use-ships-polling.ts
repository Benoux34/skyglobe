"use client";

import { useEffect } from "react";
import { useLayersStore } from "@/features/layers/layers-store";
import { useShipsStore } from "../store/ships-store";
import { fetchShipsSnapshot } from "./ships-api";

/** Ships move a few hundred metres a minute: a slow refresh is plenty. */
const REFRESH_INTERVAL_MS = 120_000;

/**
 * Keeps the ships snapshot fresh for as long as the layer is shown. While the
 * layer is hidden, the ships are loaded once if something else asked for them.
 */
export function useShipsPolling(): void {
  const enabled = useLayersStore((state) => state.visible.ships);
  const requested = useShipsStore((state) => state.requested);

  useEffect(() => {
    if (!enabled && !requested) return;
    // Already loaded for the search: nothing to refresh while nobody looks at them.
    if (!enabled && useShipsStore.getState().status === "ready") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async (): Promise<void> => {
      const { snapshotRequested, snapshotLoaded, snapshotFailed } = useShipsStore.getState();
      snapshotRequested();
      try {
        snapshotLoaded(await fetchShipsSnapshot(controller.signal));
      } catch (error) {
        if (controller.signal.aborted) return;
        // Expected wherever ships are not set up: a warning, not an error.
        console.warn("[ships]", error);
        snapshotFailed(error instanceof Error ? error.message : "Ship data could not be loaded.");
      }
      if (enabled && !controller.signal.aborted) {
        timer = setTimeout(() => void load(), REFRESH_INTERVAL_MS);
      }
    };
    void load();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, requested]);
}
