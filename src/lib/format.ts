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

/** Calendar date in a given zone as YYYY-MM-DD. en-CA is the locale that yields it. */
export function isoDateIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Whether the same instant falls on a different calendar day in two zones,
 * as -1, 0, or +1 relative to `from`.
 *
 * This is the whole reason a US audience watching an Asian league needs care:
 * 1:30 PM Sunday in Los Angeles is 4:30 AM Monday in Singapore. Printing one
 * zone's date beside the other zone's time sends someone on the wrong day.
 */
export function dayOffset(date: Date, from: string, to: string): -1 | 0 | 1 {
  const a = isoDateIn(date, from);
  const b = isoDateIn(date, to);
  if (a === b) return 0;
  return b > a ? 1 : -1;
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
 * Just the round and clock: "R2 1:14", or "R2", or null when unrecorded.
 *
 * Separate from formatFinish so a caller that already renders the method as a
 * badge can ask for the remainder directly, instead of building the full
 * string and then string-replacing the method back out of it.
 */
export function formatFinishDetail(
  endRound: number | null,
  endTimeSeconds: number | null,
): string | null {
  if (endRound == null) return null;
  const clock = formatClock(endTimeSeconds);
  return clock ? `R${endRound} ${clock}` : `R${endRound}`;
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
  const detail = formatFinishDetail(endRound, endTimeSeconds);
  return detail ? `${methodLabel} · ${detail}` : methodLabel;
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
