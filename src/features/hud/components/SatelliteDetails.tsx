"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { GLOBE_PALETTES } from "@/features/globe/lib/palette";
import {
  createOrbit,
  inclinationDegrees,
  orbitalPeriodMinutes,
  satelliteStateAt,
} from "@/features/satellites/domain/orbit";
import { satelliteGroupLabel, type SatelliteRecord } from "@/features/satellites/domain/satellite";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import { formatCoordinates, formatInteger } from "@/shared/lib/format";
import { useNowSeconds } from "@/shared/lib/use-now";
import { useTheme } from "@/shared/theme/use-theme";
import { Panel } from "@/shared/ui/Panel";
import { Fact, Row } from "./DetailFacts";

const KMS_TO_KMH = 3600;

interface SatelliteDetailsProps {
  readonly satellite: SatelliteRecord;
}

export function SatelliteDetails({ satellite }: SatelliteDetailsProps) {
  const select = useSatellitesStore((state) => state.select);
  const color = GLOBE_PALETTES[useTheme()].satellites[satellite.group];
  const now = useNowSeconds();

  const orbit = useMemo(() => createOrbit(satellite), [satellite]);
  const state =
    orbit === null || now === null ? null : satelliteStateAt(orbit, new Date(now * 1000));

  return (
    <Panel className="overflow-hidden" aria-label={`Details for ${satellite.name}`}>
      <header className="flex items-start gap-3 p-4">
        <span
          className="mt-1.5 size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-mono text-2xl leading-tight font-semibold tracking-tight text-fg">
            {satellite.name}
          </h2>
          <p className="truncate text-sm text-muted">{satelliteGroupLabel(satellite.group)}</p>
        </div>
        <button
          type="button"
          onClick={() => select(null)}
          aria-label="Close details"
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-inset hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <dl className="grid grid-cols-2 gap-px border-y border-line bg-line">
        <Fact
          label="Altitude"
          value={state === null ? "—" : `${formatInteger(state.altitudeKm)} km`}
        />
        <Fact
          label="Speed"
          value={state === null ? "—" : `${formatInteger(state.speedKmS * KMS_TO_KMH)} km/h`}
          detail={state === null ? undefined : `${state.speedKmS.toFixed(2)} km/s`}
        />
        <Fact
          label="One orbit"
          value={orbit === null ? "—" : `${formatInteger(orbitalPeriodMinutes(orbit))} min`}
        />
        <Fact
          label="Inclination"
          value={orbit === null ? "—" : `${inclinationDegrees(orbit).toFixed(1)}°`}
        />
      </dl>

      <dl className="space-y-2 p-4 text-sm">
        <Row
          label="Over"
          value={state === null ? "—" : formatCoordinates(state.latitude, state.longitude)}
        />
        <Row label="NORAD ID" value={String(satellite.id)} />
      </dl>
    </Panel>
  );
}
