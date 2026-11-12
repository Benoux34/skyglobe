"use client";

import { CloudOff, Loader2 } from "lucide-react";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { Panel } from "@/shared/ui/Panel";

/** Centre-screen message shown until the first snapshot arrives. */
export function LoadingState() {
  const hasSnapshot = useFlightsStore((state) => state.snapshot !== null);
  const error = useFlightsStore((state) => state.error);
  if (hasSnapshot) return null;

  return (
    <div className="absolute inset-0 grid place-items-center">
      <Panel className="flex max-w-sm items-center gap-3 px-5 py-4 text-sm" role="status">
        {error === null ? (
          <>
            <Loader2 className="size-5 shrink-0 animate-spin text-fg" aria-hidden />
            <span className="text-fg">Locating every aircraft in the sky…</span>
          </>
        ) : (
          <>
            <CloudOff className="size-5 shrink-0 text-rose-400" aria-hidden />
            <span className="text-fg">
              {error} <span className="text-muted">Retrying automatically.</span>
            </span>
          </>
        )}
      </Panel>
    </div>
  );
}
