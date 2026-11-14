"use client";

import { X } from "lucide-react";
import { GLOBE_PALETTES } from "@/features/globe/lib/palette";
import {
  navigationStatusLabel,
  shipDisplayName,
  shipTypeLabel,
  type Ship,
} from "@/features/ships/domain/ship";
import { useShipsStore } from "@/features/ships/store/ships-store";
import { formatAge, formatCoordinates, formatHeading, formatInteger } from "@/shared/lib/format";
import { useNowSeconds } from "@/shared/lib/use-now";
import { useTheme } from "@/shared/theme/use-theme";
import { Panel } from "@/shared/ui/Panel";
import { Fact, Row } from "./DetailFacts";

const KMH_PER_KNOT = 1.852;

interface ShipDetailsProps {
  readonly ship: Ship;
}

export function ShipDetails({ ship }: ShipDetailsProps) {
  const select = useShipsStore((state) => state.select);
  const color = GLOBE_PALETTES[useTheme()].ships[ship.category];
  const now = useNowSeconds();
  const name = shipDisplayName(ship);

  return (
    <Panel className="overflow-hidden" aria-label={`Details for ${name}`}>
      <header className="flex items-start gap-3 p-4">
        <span
          className="mt-1.5 size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-mono text-2xl leading-tight font-semibold tracking-tight text-fg">
            {name}
          </h2>
          <p className="truncate text-sm text-muted">{shipTypeLabel(ship.type)}</p>
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
          label="Speed"
          value={ship.speedKnots === null ? "—" : `${ship.speedKnots.toFixed(1)} kn`}
          detail={
            ship.speedKnots === null
              ? undefined
              : `${formatInteger(ship.speedKnots * KMH_PER_KNOT)} km/h`
          }
        />
        <Fact label="Course" value={ship.course === null ? "—" : formatHeading(ship.course)} />
        <Fact label="Status" value={navigationStatusLabel(ship.status) ?? "—"} />
        <Fact
          label="Length"
          value={ship.lengthMetres === null ? "—" : `${formatInteger(ship.lengthMetres)} m`}
        />
      </dl>

      <dl className="space-y-2 p-4 text-sm">
        <Row label="Destination" value={ship.destination ?? "—"} />
        <Row label="Position" value={formatCoordinates(ship.latitude, ship.longitude)} />
        <Row label="MMSI" value={String(ship.mmsi)} />
        <Row
          label="Last heard"
          value={now === null ? "—" : formatAge(Math.max(0, now - ship.seenAt))}
        />
      </dl>
    </Panel>
  );
}
