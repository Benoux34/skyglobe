"use client";

import { useEffect } from "react";
import { useFlightsStore } from "../store/flights-store";
import { fetchFlightsSnapshot } from "./flights-api";

const MIN_DELAY_MS = 10_000;
const RETRY_DELAY_MS = 30_000;
/** Small margin so the request lands just after the server cache expires. */
const REFRESH_MARGIN_MS = 1_500;

/** Keeps the flights store in sync with `/api/flights` for the lifetime of the caller. */
export function useFlightsPolling(): void {
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (): Promise<void> => {
      const { snapshotReceived, refreshFailed } = useFlightsStore.getState();
      let delay = RETRY_DELAY_MS;
      try {
        const snapshot = await fetchFlightsSnapshot(controller.signal);
        snapshotReceived(snapshot);
        delay = Math.max(
          MIN_DELAY_MS,
          snapshot.nextRefreshAt * 1000 - Date.now() + REFRESH_MARGIN_MS,
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        refreshFailed(error instanceof Error ? error.message : "Unable to load flights.");
      }
      timer = setTimeout(() => void poll(), delay);
    };

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
}
