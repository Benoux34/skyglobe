"use client";

import { useSyncExternalStore } from "react";

/** Shared one-second clock, so every subscriber re-renders on the same tick. */
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  timer ??= setInterval(() => {
    now = Date.now();
    listeners.forEach((notify) => notify());
  }, 1000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current time in Unix seconds, refreshed every second. `null` during server rendering. */
export function useNowSeconds(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(now / 1000),
    () => null,
  );
}
