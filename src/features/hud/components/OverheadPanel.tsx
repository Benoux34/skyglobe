"use client";

import { LocateFixed, X } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { revealAircraft, revealSatellite } from "@/features/app-shell/reveal";
import { displayName } from "@/features/flights/domain/aircraft";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectAllAircraft } from "@/features/flights/store/selectors";
import { locateObserver } from "@/features/overhead/client/locate";
import { aircraftAbove, compassPoint, type SkyPosition } from "@/features/overhead/domain/sky";
import {
  useOverheadStore,
  type SatelliteAbove,
  type StationPass,
} from "@/features/overhead/store/overhead-store";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import { formatInteger } from "@/shared/lib/format";
import { Panel } from "@/shared/ui/Panel";

const MAX_AIRCRAFT = 5;
const MAX_SATELLITES = 6;
const MAX_PASSES = 4;

const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });

/** "62° up · SW". */
const describeSky = (sky: SkyPosition): string =>
  `${Math.round(sky.elevation)}° up · ${compassPoint(sky.azimuth)}`;

/** Above this altitude a satellite hangs in the sky for hours instead of crossing it. */
const LOW_ORBIT_KM = 2000;

/**
 * Space stations first, then the other low satellites that are really passing
 * by, then the Starlink crowd, then the distant ones; the highest first in each.
 */
function mostNotable(satellites: readonly SatelliteAbove[]): SatelliteAbove[] {
  const rank = (entry: SatelliteAbove): number => {
    if (entry.satellite.group === "station") return 0;
    if (entry.altitudeKm > LOW_ORBIT_KM) return 3;
    return entry.satellite.group === "starlink" ? 2 : 1;
  };
  return [...satellites]
    .sort((a, b) => rank(a) - rank(b) || b.sky.elevation - a.sky.elevation)
    .slice(0, MAX_SATELLITES);
}

/** What is crossing the sky where the user stands: aircraft, satellites, coming station passes. */
export function OverheadPanel() {
  const status = useOverheadStore((state) => state.status);
  const turnOff = useOverheadStore((state) => state.turnOff);

  return (
    <Panel className="overflow-hidden" aria-label="Above me">
      <h2 className="flex items-center gap-2.5 px-4 pt-4 pb-2 text-sm font-medium text-fg">
        <LocateFixed className="size-4 text-muted" aria-hidden />
        Above me
        {status === "on" && (
          <button
            type="button"
            onClick={turnOff}
            aria-label="Turn off"
            className="-my-1 ml-auto grid size-7 place-items-center rounded-lg text-muted hover:bg-inset hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </h2>

      {status === "on" ? (
        <Sky />
      ) : (
        <div className="space-y-3 px-4 pb-4">
          <p className="text-xs leading-relaxed text-muted">
            {status === "denied"
              ? "Your browser did not share your position. Allow it for this site, then try again."
              : status === "unavailable"
                ? "Your position could not be found. Try again in a moment."
                : "See the aircraft and satellites crossing your sky right now. Your position stays in this browser."}
          </p>
          <button
            type="button"
            onClick={locateObserver}
            disabled={status === "locating"}
            className="w-full rounded-lg bg-fg px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {status === "locating" ? "Finding your position…" : "Use my location"}
          </button>
        </div>
      )}
    </Panel>
  );
}

function Sky() {
  const observer = useOverheadStore((state) => state.observer);
  const satellites = useOverheadStore((state) => state.satellites);
  const passes = useOverheadStore((state) => state.passes);
  const catalogStatus = useSatellitesStore((state) => state.status);
  const allAircraft = useFlightsStore(selectAllAircraft);

  const aircraft = useMemo(
    () => (observer === null ? [] : aircraftAbove(allAircraft, observer)),
    [allAircraft, observer],
  );
  const notable = useMemo(() => (satellites === null ? [] : mostNotable(satellites)), [satellites]);
  const starlinks = satellites?.filter((entry) => entry.satellite.group === "starlink").length;

  return (
    <div className="space-y-3 pb-3">
      <Section title="Aircraft" count={aircraft.length}>
        {aircraft.length === 0 && <Note>No aircraft in your sky right now.</Note>}
        {aircraft.slice(0, MAX_AIRCRAFT).map(({ aircraft: plane, sky }) => (
          <Entry
            key={plane.icao24}
            title={displayName(plane)}
            detail={describeSky(sky)}
            aside={plane.altitude === null ? "" : `${formatInteger(plane.altitude)} m`}
            onClick={() => revealAircraft(plane.icao24)}
          />
        ))}
      </Section>

      <Section title="Satellites" count={satellites?.length ?? null}>
        {satellites === null && (
          <Note>
            {catalogStatus === "error"
              ? "Satellite data could not be loaded."
              : "Counting the satellites above you…"}
          </Note>
        )}
        {satellites !== null && satellites.length === 0 && (
          <Note>No satellite high in your sky right now.</Note>
        )}
        {notable.map(({ satellite, sky, altitudeKm }) => (
          <Entry
            key={satellite.id}
            title={satellite.name}
            detail={describeSky(sky)}
            aside={`${formatInteger(altitudeKm)} km`}
            onClick={() => revealSatellite(satellite)}
          />
        ))}
        {starlinks !== undefined && starlinks > 0 && (
          <Note>{formatInteger(starlinks)} of them are Starlink satellites.</Note>
        )}
      </Section>

      <Section title="Next station passes" count={null}>
        {passes === null && <Note>Predicting the next passes…</Note>}
        {passes !== null && passes.length === 0 && (
          <Note>No space station crosses your sky in the next 24 hours.</Note>
        )}
        {passes?.slice(0, MAX_PASSES).map((entry) => (
          <PassEntry key={`${entry.satellite.id}:${entry.pass.start}`} entry={entry} />
        ))}
      </Section>
    </div>
  );
}

interface SectionProps {
  readonly title: string;
  /** How many there are in all; `null` when unknown or not worth counting. */
  readonly count: number | null;
  readonly children: ReactNode;
}

function Section({ title, count, children }: SectionProps) {
  return (
    <section>
      <h3 className="flex items-baseline justify-between px-4 pb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">
        {title}
        {count !== null && <span className="font-mono tabular-nums">{formatInteger(count)}</span>}
      </h3>
      <div className="px-2">{children}</div>
    </section>
  );
}

function Note({ children }: { readonly children: ReactNode }) {
  return <p className="px-2 py-1 text-xs text-muted">{children}</p>;
}

interface EntryProps {
  readonly title: string;
  readonly detail: string;
  readonly aside: string;
  readonly onClick: () => void;
}

function Entry({ title, detail, aside, onClick }: EntryProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-inset"
    >
      <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-fg">{title}</span>
      <span className="shrink-0 text-xs text-muted">{detail}</span>
      <span className="w-[4.5rem] shrink-0 text-right font-mono text-xs whitespace-nowrap text-subtle tabular-nums">
        {aside}
      </span>
    </button>
  );
}

function PassEntry({ entry: { satellite, pass } }: { readonly entry: StationPass }) {
  const start = new Date(pass.start);
  return (
    <button
      type="button"
      onClick={() => revealSatellite(satellite)}
      className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-inset"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="truncate font-mono text-sm font-medium text-fg">{satellite.name}</span>
        <span className="shrink-0 font-mono text-xs text-fg tabular-nums">
          {weekday.format(start)} {clock.format(start)}
        </span>
      </span>
      <span className="flex items-baseline justify-between gap-3 text-xs text-muted">
        <span className="truncate">
          Up to {Math.round(pass.maxElevation)}° · {compassPoint(pass.startAzimuth)} to{" "}
          {compassPoint(pass.endAzimuth)}
        </span>
        <span className={`shrink-0 ${pass.visible ? "font-medium text-fg" : ""}`}>
          {pass.visible ? "Visible" : "Not visible"}
        </span>
      </span>
    </button>
  );
}
