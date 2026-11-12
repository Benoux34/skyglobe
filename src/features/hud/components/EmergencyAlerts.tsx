"use client";

import { TriangleAlert } from "lucide-react";
import { displayName } from "@/features/flights/domain/aircraft";
import { emergencyOf } from "@/features/flights/domain/emergency";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectEmergencyAircraft } from "@/features/flights/store/selectors";
import { Panel } from "@/shared/ui/Panel";

/** Lists the aircraft squawking a distress code; hidden while there are none. */
export function EmergencyAlerts() {
  const emergencies = useFlightsStore(selectEmergencyAircraft);
  const selectedId = useFlightsStore((state) => state.selectedId);
  const selectAndFocus = useFlightsStore((state) => state.selectAndFocus);

  if (emergencies.length === 0) return null;

  return (
    <Panel className="overflow-hidden border-alert/60" aria-label="Emergency alerts">
      <h2 className="flex items-center gap-2 px-4 pt-3 pb-2 text-xs font-medium tracking-wide text-alert uppercase">
        <TriangleAlert className="size-4" aria-hidden />
        Emergency squawks
        <span className="ml-auto font-mono tabular-nums">{emergencies.length}</span>
      </h2>
      <ul className="px-2 pb-2">
        {emergencies.map((aircraft) => {
          const emergency = emergencyOf(aircraft);
          if (emergency === null) return null;
          return (
            <li key={aircraft.icao24}>
              <button
                type="button"
                onClick={() => selectAndFocus(aircraft.icao24)}
                aria-current={aircraft.icao24 === selectedId}
                title={emergency.description}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-inset aria-[current=true]:bg-inset"
              >
                <span className="rounded-md bg-alert px-1.5 py-0.5 font-mono text-xs font-semibold text-white tabular-nums">
                  {emergency.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-sm font-medium text-fg">
                    {displayName(aircraft)}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {emergency.label} · {aircraft.originCountry}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
