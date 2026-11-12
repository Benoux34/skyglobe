import type { Aircraft } from "./aircraft";

const normalize = (value: string): string => value.replace(/\s+/g, "").toUpperCase();

/**
 * Finds aircraft by callsign or ICAO24 address. Prefix matches rank before
 * substring matches; airborne aircraft rank before parked ones.
 */
export function searchAircraft(
  aircraft: readonly Aircraft[],
  query: string,
  limit: number,
): Aircraft[] {
  const needle = normalize(query);
  if (needle.length === 0) return [];

  const scored: { aircraft: Aircraft; score: number }[] = [];
  for (const a of aircraft) {
    const callsign = a.callsign === null ? "" : normalize(a.callsign);
    const icao = a.icao24.toUpperCase();

    let score: number;
    if (callsign === needle || icao === needle) score = 0;
    else if (callsign.startsWith(needle)) score = 1;
    else if (icao.startsWith(needle)) score = 2;
    else if (callsign.includes(needle)) score = 3;
    else continue;

    scored.push({ aircraft: a, score: score + (a.onGround ? 0.5 : 0) });
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.aircraft);
}
