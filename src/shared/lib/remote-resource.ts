"use client";

import { useEffect, useSyncExternalStore } from "react";

export type Remote<T> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly data: T }
  | { readonly status: "error" };

const LOADING = { status: "loading" } as const;
const FAILED = { status: "error" } as const;

interface RemoteResourceOptions<Input, T> {
  /** Shown in front of the errors written to the console. */
  readonly name: string;
  /** Two inputs with the same key are the same thing and are loaded once. */
  keyOf(input: Input): string;
  load(input: Input): Promise<T>;
}

/**
 * Builds a hook that loads something once per key and keeps it for the rest of
 * the visit: looking at the same satellite twice asks the network only once.
 * The hook returns `null` when given no input.
 */
export function createRemoteResource<Input, T>({
  name,
  keyOf,
  load,
}: RemoteResourceOptions<Input, T>): (input: Input | null) => Remote<T> | null {
  const entries = new Map<string, Remote<T>>();
  const listeners = new Set<() => void>();

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const request = (input: Input): void => {
    const key = keyOf(input);
    if (entries.has(key)) return;
    entries.set(key, LOADING);
    load(input)
      .then(
        (data) => {
          entries.set(key, { status: "ready", data });
        },
        (error: unknown) => {
          console.error(`[${name}]`, error);
          entries.set(key, FAILED);
        },
      )
      .finally(() => listeners.forEach((notify) => notify()));
  };

  return function useRemoteResource(input) {
    const key = input === null ? null : keyOf(input);

    useEffect(() => {
      // Asking again for something already requested does nothing.
      if (input !== null) request(input);
    }, [input]);

    return useSyncExternalStore(
      subscribe,
      () => (key === null ? null : (entries.get(key) ?? LOADING)),
      () => null,
    );
  };
}
