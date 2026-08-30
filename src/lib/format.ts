/**
 * Formatting helpers.
 *
 * Everything here takes a UTC instant and an IANA timezone. Nothing in this
 * file assumes the server's timezone, because the server is in whatever region
 * Vercel put it in and that is never the answer we want.
 */

/** e.g. "Sat 14 Mar" */
export function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(date);
}

/** e.g. "Sat 14 Mar 2026" */
export function formatDateLong(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(date);
}

/** e.g. "8:00 PM" */
export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

/**
 * Short zone label, e.g. "ET", "SGT".
 *
 * Intl gives "GMT+8" for zones with no common abbreviation, which is accurate
 * and useless to a reader. Falls back to the city name from the IANA
 * identifier in that case — "Singapore" tells someone more than "GMT+8".
 */
export function formatZoneLabel(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(date);

  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  if (name && !name.startsWith("GMT")) return name;

  const city = timeZone.split("/").pop()?.replace(/_/g, " ");
  return city ?? name;
}

/** e.g. "8:00 PM SGT" */
export function formatTimeWithZone(date: Date, timeZone: string): string {
  return `${formatTime(date, timeZone)} ${formatZoneLabel(date, timeZone)}`;
}

/** Seconds into a round as a clock, e.g. 74 -> "1:14". */
export function formatClock(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * How a bout ended, in the form a fight card uses: "KO · R2 1:14".
 * Returns just the method when the round and time are not recorded.
 */
export function formatFinish(
  methodLabel: string,
  endRound: number | null,
  endTimeSeconds: number | null,
): string {
  const clock = formatClock(endTimeSeconds);
  if (endRound == null) return methodLabel;
  return clock
    ? `${methodLabel} · R${endRound} ${clock}`
    : `${methodLabel} · R${endRound}`;
}

/** Height in cm as "172 cm", or null. */
export function formatHeight(cm: number | null): string | null {
  return cm == null ? null : `${cm} cm`;
}

/**
 * Grams as kilograms, e.g. 71000 -> "71.0 kg".
 *
 * Mass is stored in grams so a 62.5 kg robot needs no float in the database;
 * this is the only place that conversion happens.
 */
export function formatWeight(grams: number | null): string | null {
  if (grams == null) return null;
  return `${(grams / 1000).toFixed(1)} kg`;
}

/** Sentence-case a snake_case or kebab-case token for display. */
export function humanize(value: string): string {
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
