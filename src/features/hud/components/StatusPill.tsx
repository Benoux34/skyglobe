"use client";

import { useFlightsStore } from "@/features/flights/store/flights-store";
import { formatAge } from "@/shared/lib/format";
import { useNowSeconds } from "@/shared/lib/use-now";
import { Panel } from "@/shared/ui/Panel";

interface StatusPillProps {
  /** Shorter wording for narrow screens. */
  readonly compact?: boolean;
}

export function StatusPill({ compact = false }: StatusPillProps) {
  const snapshotTime = useFlightsStore((state) => state.snapshot?.time ?? null);
  const error = useFlightsStore((state) => state.error);
  const now = useNowSeconds();

  let dot = "bg-subtle";
  let text = "Connecting to OpenSky…";
  if (snapshotTime !== null) {
    const age = now === null ? null : formatAge(Math.max(0, now - snapshotTime));
    dot = error === null ? "bg-emerald-500" : "bg-amber-500";
    const state = error === null ? "Live" : "Reconnecting";
    const updated = compact ? age : `positions updated ${age}`;
    text = age === null ? state : `${state} · ${updated}`;
  } else if (error !== null) {
    dot = "bg-rose-500";
    text = compact ? "Unavailable" : "Flight data unavailable";
  } else if (compact) {
    text = "Connecting…";
  }

  return (
    <Panel
      className="flex h-10 min-w-0 items-center gap-2.5 rounded-lg px-3.5 text-sm whitespace-nowrap text-fg"
      role="status"
      title={
        error ??
        "Positions between two updates are estimated from each aircraft's last speed and heading."
      }
    >
      <span className={`size-2 shrink-0 rounded-full ${dot}`} />
      {text}
    </Panel>
  );
}
