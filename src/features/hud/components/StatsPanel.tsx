"use client";

import { bandColor, rgbToCss } from "@/features/flights/domain/altitude";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectAllAircraft, selectVisibleStats } from "@/features/flights/store/selectors";
import { formatInteger } from "@/shared/lib/format";
import { msToKnots } from "@/shared/lib/units";
import { Panel } from "@/shared/ui/Panel";

const TOP_COUNTRIES = 5;

export function StatsPanel() {
  const stats = useFlightsStore(selectVisibleStats);
  const totalTracked = useFlightsStore(selectAllAircraft).length;
  const topCountries = stats.countries.slice(0, TOP_COUNTRIES);
  const maxCountry = Math.max(1, ...topCountries.map((c) => c.count));
  const maxBand = Math.max(1, ...stats.altitudeBands.map((b) => b.count));

  return (
    <Panel className="space-y-5 p-4" aria-label="Live statistics">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">In the air now</p>
        <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-fg tabular-nums">
          {formatInteger(stats.airborne)}
        </p>
        <p className="mt-1 text-xs text-muted">
          Showing {formatInteger(stats.total)} of {formatInteger(totalTracked)} tracked aircraft
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Metric label="On the ground" value={formatInteger(stats.onGround)} />
        <Metric
          label="Avg. speed"
          value={
            stats.meanAirborneSpeed === null
              ? "—"
              : `${formatInteger(msToKnots(stats.meanAirborneSpeed))} kt`
          }
        />
      </dl>

      <div className="space-y-2">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">By altitude</h2>
        <div className="flex h-20 items-end gap-1.5" role="list">
          {stats.altitudeBands.map(({ band, count }) => (
            <div
              key={band.label}
              role="listitem"
              title={`${band.label}: ${formatInteger(count)} aircraft`}
              className="flex h-full flex-1 flex-col justify-end gap-1"
            >
              <span className="text-center font-mono text-[10px] text-muted tabular-nums">
                {formatInteger(count)}
              </span>
              <div
                className="min-h-0.5 rounded-t-sm"
                style={{
                  height: `${(count / maxBand) * 100}%`,
                  backgroundColor: rgbToCss(bandColor(band)),
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 text-center text-[10px] text-subtle">
          {stats.altitudeBands.map(({ band }) => (
            <span key={band.label} className="flex-1 whitespace-nowrap">
              {band.label.replace(" ft", "")}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
          Top countries of registration
        </h2>
        {topCountries.length === 0 && <p className="text-sm text-subtle">No aircraft to show.</p>}
        <ol className="space-y-1.5">
          {topCountries.map(({ country, count }) => (
            <li key={country} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate text-fg">{country}</span>
                <span className="font-mono text-muted tabular-nums">{formatInteger(count)}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-inset">
                <div
                  className="h-full rounded-full bg-fg/70"
                  style={{ width: `${(count / maxCountry) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-xl bg-inset px-3 py-2">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="font-mono text-sm font-medium text-fg tabular-nums">{value}</dd>
    </div>
  );
}
