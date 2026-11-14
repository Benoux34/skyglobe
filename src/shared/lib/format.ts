const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const formatInteger = (value: number): string => integer.format(value);

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function formatHeading(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const point = COMPASS_POINTS[Math.round(normalized / 45) % COMPASS_POINTS.length] ?? "N";
  return `${Math.round(normalized).toString().padStart(3, "0")}° ${point}`;
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lon}`;
}

const calendarDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "20 Nov 1998", in UTC. */
export const formatDate = (date: Date): string => calendarDate.format(date);

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

/** How long ago `date` was: "under a year", "1 year", "27 years". */
export function formatYearsSince(date: Date, now: Date): string {
  const years = Math.floor((now.getTime() - date.getTime()) / MS_PER_YEAR);
  if (years < 1) return "under a year";
  return years === 1 ? "1 year" : `${years} years`;
}

/** "just now", "45s ago", "12 min ago", "3 h ago". */
export function formatAge(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 90) return `${Math.round(seconds)}s ago`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`;
  return `${Math.round(seconds / 3600)} h ago`;
}
