"use client";

import { useEffect } from "react";
import { useLayersStore } from "@/features/layers/layers-store";
import { useShipsStore } from "../store/ships-store";
import { fetchShipsSnapshot } from "./ships-api";

/** Ships move a few hundred metres a minute: a slow refresh is plenty. */
const REFRESH_INTERVAL_MS = 120_000;

/** Keeps the ships snapshot fresh for as long as the layer is shown. */
export function useShipsPolling(): void {
  const enabled = useLayersStore((state) => state.visible.ships);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async (): Promise<void> => {
      const { snapshotRequested, snapshotLoaded, snapshotFailed } = useShipsStore.getState();
      snapshotRequested();
      try {
        snapshotLoaded(await fetchShipsSnapshot(controller.signal));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[ships]", error);
        snapshotFailed(error instanceof Error ? error.message : "Ship data could not be loaded.");
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void load(), REFRESH_INTERVAL_MS);
    };
    void load();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled]);
}
