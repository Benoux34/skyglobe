"use client";

import { z } from "zod";
import { createRemoteResource } from "@/shared/lib/remote-resource";
import {
  fetchWikipediaArticle,
  type WikipediaArticle,
  type WikipediaTopic,
} from "@/shared/wikimedia/wikipedia";
import { satcatRecordSchema, toCatalogEntry, type CatalogEntry } from "../domain/satcat";
import type { SatelliteId } from "../domain/satellite";

const SATCAT_URL = "https://celestrak.org/satcat/records.php";

async function fetchCatalogEntry(id: SatelliteId): Promise<CatalogEntry | null> {
  const response = await fetch(`${SATCAT_URL}?CATNR=${id}&FORMAT=json`);
  if (!response.ok) throw new Error(`CelesTrak answered with HTTP ${response.status}.`);
  const [record] = z.array(satcatRecordSchema).parse(await response.json());
  return record === undefined ? null : toCatalogEntry(record);
}

/** Launch date, launch site, owner and status of a satellite, from the public catalogue. */
export const useCatalogEntry = createRemoteResource<SatelliteId, CatalogEntry | null>({
  name: "satellite catalogue",
  keyOf: String,
  load: fetchCatalogEntry,
});

/** Picture and short description of a satellite, or of the constellation it belongs to. */
export const useSatelliteArticle = createRemoteResource<WikipediaTopic, WikipediaArticle | null>({
  name: "wikipedia",
  keyOf: (topic) => (topic.kind === "title" ? `title:${topic.title}` : `search:${topic.name}`),
  load: fetchWikipediaArticle,
});
