"use client";

import { X } from "lucide-react";
import { GLOBE_PALETTES } from "@/features/globe/lib/palette";
import { useShipPhoto } from "@/features/ships/client/ship-photo";
import { flagOfMmsi } from "@/features/ships/domain/flag";
import {
  formatEta,
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
import { DetailPhoto, DetailPhotoPlaceholder } from "./DetailMedia";

const KMH_PER_KNOT = 1.852;

/** "400 × 59 m", or the length alone when the beam is unknown. */
function formatSize(ship: Ship): string {
  if (ship.lengthMetres === null) return "—";
  const length = formatInteger(ship.lengthMetres);
  return ship.beamMetres === null
    ? `${length} m`
    : `${length} × ${formatInteger(ship.beamMetres)} m`;
}

interface ShipDetailsProps {
  readonly ship: Ship;
}

export function ShipDetails({ ship }: ShipDetailsProps) {
  const select = useShipsStore((state) => state.select);
  const color = GLOBE_PALETTES[useTheme()].ships[ship.category];
  const now = useNowSeconds();
  const name = shipDisplayName(ship);
  const flag = flagOfMmsi(ship.mmsi);
  // Photos are filed by IMO number, which small craft do not have.
  const photoRequest = useShipPhoto(ship.imo);
  const photo = photoRequest?.status === "ready" ? photoRequest.data : null;

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
          <p className="truncate text-sm text-muted">
            {flag === null
              ? shipTypeLabel(ship.type)
              : `${flag.emoji} ${flag.country} · ${shipTypeLabel(ship.type)}`}
          </p>
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

      {photoRequest?.status === "loading" && <DetailPhotoPlaceholder />}
      {photo !== null && (
        <DetailPhoto
          src={photo.url}
          width={photo.width}
          height={photo.height}
          alt={`Photo of ${name}`}
          credit={[photo.author, photo.license, "Wikimedia Commons"]
            .filter((part) => part !== null)
            .join(" · ")}
          href={photo.pageUrl}
        />
      )}

      <dl className="mt-4 grid grid-cols-2 gap-px border-y border-line bg-line">
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
        <Fact label="Size" value={formatSize(ship)} />
      </dl>

      <dl className="space-y-2 p-4 text-sm">
        <Row label="Destination" value={ship.destination ?? "—"} />
        <Row label="Expected" value={formatEta(ship.eta)} />
        <Row
          label="Draught"
          value={ship.draughtMetres === null ? null : `${ship.draughtMetres.toFixed(1)} m`}
        />
        <Row label="Position" value={formatCoordinates(ship.latitude, ship.longitude)} />
        <Row label="Flag" value={flag?.country ?? null} />
        <Row label="IMO" value={ship.imo === null ? null : String(ship.imo)} />
        <Row label="Call sign" value={ship.callsign} />
        <Row label="MMSI" value={String(ship.mmsi)} />
        <Row
          label="Last heard"
          value={now === null ? "—" : formatAge(Math.max(0, now - ship.seenAt))}
        />
      </dl>
    </Panel>
  );
}
