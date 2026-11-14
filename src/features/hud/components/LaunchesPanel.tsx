"use client";

import { Rocket } from "lucide-react";
import { useCameraStore } from "@/features/globe/store/camera-store";
import { formatCountdown, type Launch } from "@/features/launches/domain/launch";
import { useLaunchesStore } from "@/features/launches/store/launches-store";
import { useNowSeconds } from "@/shared/lib/use-now";
import { Panel } from "@/shared/ui/Panel";

/** Upcoming rocket launches with a live countdown; picking one flies to its pad. */
export function LaunchesPanel() {
  const status = useLaunchesStore((state) => state.status);
  const launches = useLaunchesStore((state) => state.launches);
  const selectedId = useLaunchesStore((state) => state.selectedId);
  const select = useLaunchesStore((state) => state.select);
  const flyTo = useCameraStore((state) => state.flyTo);
  const now = useNowSeconds();

  const choose = (launch: Launch): void => {
    select(launch.id === selectedId ? null : launch.id);
    if (launch.pad !== null) flyTo(launch.pad.latitude, launch.pad.longitude);
  };

  return (
    <Panel className="overflow-hidden" aria-label="Upcoming rocket launches">
      <h2 className="flex items-center gap-2.5 px-4 pt-4 pb-2 text-sm font-medium text-fg">
        <Rocket className="size-4 text-muted" aria-hidden />
        Upcoming launches
      </h2>

      {status === "error" && (
        <p className="px-4 pb-4 text-xs text-muted">Launch data could not be loaded.</p>
      )}
      {(status === "idle" || status === "loading") && (
        <p className="px-4 pb-4 text-xs text-muted">Loading the launch schedule…</p>
      )}
      {status === "ready" && launches.length === 0 && (
        <p className="px-4 pb-4 text-xs text-muted">No launch is scheduled.</p>
      )}

      {launches.length > 0 && (
        <ul className="max-h-72 overflow-y-auto px-2 pb-2">
          {launches.map((launch) => (
            <li key={launch.id}>
              <button
                type="button"
                onClick={() => choose(launch)}
                aria-current={launch.id === selectedId}
                title={launch.statusDescription ?? undefined}
                className="w-full rounded-lg px-2 py-2 text-left hover:bg-inset aria-[current=true]:bg-inset"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-fg">{launch.rocket}</span>
                  <span className="shrink-0 font-mono text-xs text-fg tabular-nums">
                    {now === null ? "" : formatCountdown(launch.liftoffTime - now)}
                  </span>
                </span>
                <span className="flex items-baseline justify-between gap-3 text-xs text-muted">
                  <span className="truncate">{launch.mission ?? launch.provider ?? "—"}</span>
                  {launch.status !== null && <span className="shrink-0">{launch.status}</span>}
                </span>
                <span className="block truncate text-xs text-subtle">
                  {launch.pad?.location ?? launch.pad?.name ?? "Launch site unknown"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
