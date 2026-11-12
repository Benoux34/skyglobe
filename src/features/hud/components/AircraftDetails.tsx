"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  LocateFixed,
  TriangleAlert,
  X,
} from "lucide-react";
import { displayName, type Aircraft } from "@/features/flights/domain/aircraft";
import { aircraftColor, rgbToCss } from "@/features/flights/domain/altitude";
import { EMERGENCY_COLOR, emergencyOf } from "@/features/flights/domain/emergency";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { formatAge, formatCoordinates, formatHeading, formatInteger } from "@/shared/lib/format";
import { metresToFeet, msToFeetPerMinute, msToKmh, msToKnots } from "@/shared/lib/units";
import { useNowSeconds } from "@/shared/lib/use-now";
import { AirframeSummary } from "./AirframeSummary";
import { RouteSummary } from "./RouteSummary";
import { Panel } from "@/shared/ui/Panel";

/** Below this vertical rate (ft/min) an aircraft is considered level. */
const LEVEL_FLIGHT_THRESHOLD = 100;

interface AircraftDetailsProps {
  readonly aircraft: Aircraft;
}

export function AircraftDetails({ aircraft }: AircraftDetailsProps) {
  const select = useFlightsStore((state) => state.select);
  const toggleFollow = useFlightsStore((state) => state.toggleFollow);
  const following = useFlightsStore((state) => state.followingId === aircraft.icao24);
  const now = useNowSeconds();
  const emergency = emergencyOf(aircraft);
  const dotColor = emergency === null ? aircraftColor(aircraft) : EMERGENCY_COLOR;

  return (
    <Panel className="overflow-hidden" aria-label={`Details for ${displayName(aircraft)}`}>
      <header className="flex items-start gap-3 p-4">
        <span
          className="mt-1.5 size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: rgbToCss(dotColor) }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-mono text-2xl leading-tight font-semibold tracking-tight text-fg">
            {displayName(aircraft)}
          </h2>
          <p className="truncate text-sm text-muted">{aircraft.originCountry}</p>
        </div>
        <button
          type="button"
          onClick={toggleFollow}
          aria-pressed={following}
          aria-label={following ? "Stop following this aircraft" : "Follow this aircraft"}
          title={following ? "Stop following" : "Follow aircraft"}
          className={`grid size-8 place-items-center rounded-lg transition-colors ${
            following ? "bg-fg text-background" : "text-muted hover:bg-inset hover:text-fg"
          }`}
        >
          <LocateFixed className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => select(null)}
          aria-label="Close details"
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-inset hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      {emergency !== null && (
        <div role="alert" className="flex items-start gap-2.5 bg-alert px-4 py-2.5 text-white">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {emergency.label} · squawk {emergency.code}
            </p>
            <p className="text-xs opacity-90">{emergency.description}</p>
          </div>
        </div>
      )}

      <AirframeSummary />
      <RouteSummary />

      <dl className="grid grid-cols-2 gap-px border-y border-line bg-line">
        <Fact label="Altitude" {...altitudeFact(aircraft)} />
        <Fact label="Ground speed" {...speedFact(aircraft)} />
        <Fact
          label="Heading"
          primary={aircraft.track === null ? "—" : formatHeading(aircraft.track)}
        />
        <Fact label="Vertical rate" {...verticalRateFact(aircraft)} />
      </dl>

      <dl className="space-y-2 p-4 text-sm">
        <Row label="Position" value={formatCoordinates(aircraft.latitude, aircraft.longitude)} />
        <Row label="ICAO24" value={aircraft.icao24.toUpperCase()} />
        <Row label="Squawk" value={aircraft.squawk ?? "—"} />
        <Row
          label="Last report"
          value={now === null ? "—" : formatAge(Math.max(0, now - aircraft.positionTime))}
        />
      </dl>
    </Panel>
  );
}

interface FactContent {
  readonly primary: string;
  readonly secondary?: string;
  readonly icon?: React.ReactNode;
}

function altitudeFact(aircraft: Aircraft): FactContent {
  if (aircraft.onGround) return { primary: "On ground" };
  if (aircraft.altitude === null) return { primary: "—" };
  return {
    primary: `${formatInteger(metresToFeet(aircraft.altitude))} ft`,
    secondary: `${formatInteger(aircraft.altitude)} m`,
  };
}

function speedFact(aircraft: Aircraft): FactContent {
  if (aircraft.velocity === null) return { primary: "—" };
  return {
    primary: `${formatInteger(msToKnots(aircraft.velocity))} kt`,
    secondary: `${formatInteger(msToKmh(aircraft.velocity))} km/h`,
  };
}

function verticalRateFact(aircraft: Aircraft): FactContent {
  if (aircraft.verticalRate === null) return { primary: "—" };
  const feetPerMinute = msToFeetPerMinute(aircraft.verticalRate);
  if (Math.abs(feetPerMinute) < LEVEL_FLIGHT_THRESHOLD) {
    return { primary: "Level", icon: <ArrowRight className="size-4 text-muted" aria-hidden /> };
  }
  const climbing = feetPerMinute > 0;
  return {
    primary: `${climbing ? "+" : "−"}${formatInteger(Math.abs(feetPerMinute))} fpm`,
    secondary: climbing ? "Climbing" : "Descending",
    icon: climbing ? (
      <ArrowUpRight className="size-4 text-emerald-400" aria-hidden />
    ) : (
      <ArrowDownRight className="size-4 text-amber-400" aria-hidden />
    ),
  };
}

function Fact({ label, primary, secondary, icon }: FactContent & { readonly label: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-mono text-base font-medium text-fg tabular-nums">
        {icon}
        {primary}
      </dd>
      <dd className="h-4 font-mono text-xs text-subtle tabular-nums">{secondary}</dd>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-fg tabular-nums">{value}</dd>
    </div>
  );
}
