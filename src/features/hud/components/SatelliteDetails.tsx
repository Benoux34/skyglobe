"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { GLOBE_PALETTES } from "@/features/globe/lib/palette";
import {
  useCatalogEntry,
  useSatelliteArticle,
} from "@/features/satellites/client/satellite-reference";
import {
  createOrbit,
  inclinationDegrees,
  orbitalPeriodMinutes,
  orbitRegime,
  orbitShape,
  satelliteStateAt,
} from "@/features/satellites/domain/orbit";
import {
  elementsEpoch,
  internationalDesignator,
  launchYear,
  satelliteGroupLabel,
  type SatelliteRecord,
} from "@/features/satellites/domain/satellite";
import { wikipediaTopicFor } from "@/features/satellites/domain/wikipedia-topic";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import {
  formatCoordinates,
  formatDate,
  formatInteger,
  formatYearsSince,
} from "@/shared/lib/format";
import { useNowSeconds } from "@/shared/lib/use-now";
import { useTheme } from "@/shared/theme/use-theme";
import { Panel } from "@/shared/ui/Panel";
import { Fact, Row } from "./DetailFacts";
import { DetailPhoto, DetailPhotoPlaceholder, DetailSummary } from "./DetailMedia";

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
  const shape = orbit === null ? null : orbitShape(orbit);
  const epoch = elementsEpoch(satellite.line1);

  const topic = useMemo(() => wikipediaTopicFor(satellite), [satellite]);
  const articleRequest = useSatelliteArticle(topic);
  const article = articleRequest?.status === "ready" ? articleRequest.data : null;
  const catalogRequest = useCatalogEntry(satellite.id);
  const catalog = catalogRequest?.status === "ready" ? catalogRequest.data : null;

  const launchDate =
    catalog === null || catalog.launchDate === null ? null : new Date(catalog.launchDate);
  // Until the catalogue answers, the element set at least gives the year.
  const launched =
    launchDate !== null
      ? formatDate(launchDate)
      : (launchYear(satellite.line1)?.toString() ?? null);

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
          <p className="truncate text-sm text-muted">
            {article?.description ?? satelliteGroupLabel(satellite.group)}
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

      {articleRequest?.status === "loading" && <DetailPhotoPlaceholder />}
      {article !== null && article.image !== null && (
        <DetailPhoto
          src={article.image.url}
          width={article.image.width}
          height={article.image.height}
          alt={article.title}
          credit={`${article.title} · Wikipedia`}
          href={article.url}
        />
      )}
      {article !== null && article.summary !== null && (
        <DetailSummary text={article.summary} href={article.url} />
      )}

      <dl className="mt-4 grid grid-cols-2 gap-px border-y border-line bg-line">
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
          detail={shape === null ? undefined : `${shape.revolutionsPerDay.toFixed(1)} per day`}
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
        <Row label="Orbit" value={orbit === null ? null : orbitRegime(orbit)} />
        <Row
          label="Lowest – highest"
          value={
            shape === null
              ? null
              : `${formatInteger(shape.perigeeKm)} – ${formatInteger(shape.apogeeKm)} km`
          }
        />
        <Row label="Launched" value={launched} />
        <Row
          label="In orbit for"
          value={
            launchDate === null || now === null
              ? null
              : formatYearsSince(launchDate, new Date(now * 1000))
          }
        />
        <Row label="Launch site" value={catalog?.launchSite ?? null} />
        <Row label="Owner" value={catalog?.owner ?? null} />
        <Row label="Type" value={catalog?.kind ?? null} />
        <Row label="Status" value={catalog?.status ?? null} />
        <Row
          label="Radar size"
          value={
            catalog === null || catalog.radarCrossSection === null
              ? null
              : `${catalog.radarCrossSection.toFixed(1)} m²`
          }
        />
        <Row label="Designation" value={internationalDesignator(satellite.line1)} />
        <Row label="NORAD ID" value={String(satellite.id)} />
        <Row label="Orbit measured" value={epoch === null ? null : formatDate(epoch)} />
      </dl>
    </Panel>
  );
}
