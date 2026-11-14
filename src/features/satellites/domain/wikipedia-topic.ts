import type { WikipediaTopic } from "@/shared/wikimedia/wikipedia";
import type { SatelliteRecord } from "./satellite";

/**
 * Constellations whose satellites have no article of their own: thousands of
 * them share the article of the constellation.
 */
const CONSTELLATIONS: readonly (readonly [name: RegExp, article: string])[] = [
  [/^STARLINK/, "Starlink"],
  [/^ONEWEB/, "Eutelsat OneWeb"],
  [/^KUIPER/, "Project Kuiper"],
  [/^IRIDIUM/, "Iridium satellite constellation"],
  [/^GLOBALSTAR/, "Globalstar"],
  [/^ORBCOMM/, "Orbcomm"],
  [/^(NAVSTAR|GPS )/, "Global Positioning System"],
  [/^(GSAT0|GALILEO)/, "Galileo (satellite navigation)"],
  [/^BEIDOU/, "BeiDou"],
  [/^(QZS|MICHIBIKI)/, "Quasi-Zenith Satellite System"],
  [/^(IRNSS|NVS-)/, "Indian Regional Navigation Satellite System"],
  [/^(FLOCK|DOVE|SKYSAT)/, "Planet Labs"],
  [/^LEMUR/, "Spire Global"],
  [/^QIANFAN/, "Qianfan"],
  [/^HST$/, "Hubble Space Telescope"],
];

const STATIONS: Readonly<Record<string, string>> = {
  ISS: "International Space Station",
  Tiangong: "Tiangong space station",
};

/** Which Wikipedia article tells the most about a satellite. */
export function wikipediaTopicFor(
  satellite: Pick<SatelliteRecord, "name" | "group">,
): WikipediaTopic {
  const station = STATIONS[satellite.name];
  if (station !== undefined) return { kind: "title", title: station };

  const constellation = CONSTELLATIONS.find(([pattern]) => pattern.test(satellite.name));
  if (constellation !== undefined) return { kind: "title", title: constellation[1] };
  // Russia's positioning satellites are catalogued under the catch-all "COSMOS" name.
  if (satellite.group === "navigation" && satellite.name.startsWith("COSMOS")) {
    return { kind: "title", title: "GLONASS" };
  }

  const name = satellite.name
    // "NAME (ALIAS)" is catalogued under its first name.
    .replace(/\s*\(.*$/, "")
    // Wikipedia spells the Soviet and Russian series with a K.
    .replace(/^COSMOS\b/, "KOSMOS")
    .trim();
  // "YAOGAN-35 A" belongs to the Yaogan family, "FENGYUN 3D" to Fengyun.
  const family = /^[A-Z]{4,}/.exec(name)?.[0] ?? null;
  return { kind: "search", name, context: "satellite", family };
}
