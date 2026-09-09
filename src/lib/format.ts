/**
 * Formatting helpers.
 *
 * Everything here takes a UTC instant and an IANA timezone. Nothing in this
 * file assumes the server's timezone, because the server is in whatever region
 * Vercel put it in and that is never the answer we want.
 *
 * Every zone passes through safeTimeZone() first. Intl throws a RangeError on
 * an unrecognised zone, and these run inside components — so one bad row in
 * the database would not render wrongly, it would take the page down. The form
 * now validates on the way in; this is the guard for anything already stored,
 * imported, or written by a future code path that forgets.
 */

import { safeTimeZone } from "@/lib/timezones";
// Type-only: erased at build, so this does not pull the schema (and its
// database client) into the client bundles that import this file.
import type { BoutMethodValue } from "@/db/schema";

/** e.g. "Sat 14 Mar" */
export function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: safeTimeZone(timeZone),
  }).format(date);
}

/** e.g. "Sat 14 Mar 2026" */
export function formatDateLong(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: safeTimeZone(timeZone),
  }).format(date);
}

/** Calendar date in a given zone as YYYY-MM-DD. en-CA is the locale that yields it. */
export function isoDateIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
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

/**
 * A UTC instant as a `datetime-local` value in a given zone: "2026-09-20T20:00".
 *
 * Used to populate the event form, so an organizer edits the time on the
 * clock at the venue — the same number they were given — rather than a UTC
 * instant they would have to convert in their head.
 */
export function toDateTimeLocal(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  // Intl renders midnight as "24" in some locales/zones; the input wants "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** e.g. "8:00 PM" */
export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: safeTimeZone(timeZone),
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
    timeZone: safeTimeZone(timeZone),
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

/**
 * A coarse "how far away is this", e.g. "Tomorrow", "in 12 days", "in 8 weeks".
 *
 * HLTV's event rail does this — "10 days", "56 days" — and it is the right
 * register for a sparse calendar. An exact countdown to something nine weeks
 * out is false precision that nobody reads; "in 9 weeks" is the actual answer
 * to the question being asked. The live countdown still runs on the event
 * itself and in the strip, where the number genuinely matters.
 *
 * Computed in UTC rather than the reader's zone, which the server does not
 * know. That can be a day out for a few hours around midnight — acceptable for
 * a label that already rounds to whole days, and the alternative is either a
 * hydration mismatch or a client component for a static phrase.
 */
export function formatDaysUntil(target: Date, now: Date): string | null {
  const MS_PER_DAY = 86_400_000;
  const startOfDay = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const days = Math.round((startOfDay(target) - startOfDay(now)) / MS_PER_DAY);

  if (days < 0) return null;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `in ${days} days`;

  const weeks = Math.round(days / 7);
  if (weeks < 9) return `in ${weeks} weeks`;

  // Always plural, and that is provable rather than sloppy: this line is only
  // reached at 9 weeks or more, which is 60+ days, so the rounded month count
  // can never be 1. A `months === 1 ? "" : "s"` here would be a branch that
  // cannot execute — and an unreachable branch is worse than no branch,
  // because it implies a case someone will later try to reason about.
  return `in ${Math.round(days / 30)} months`;
}

/** Sentence-case a snake_case or kebab-case token for display. */
export function humanize(value: string): string {
  const spaced = value
    .replace(/[_-]+/g, " ")
    // Split camelCase too — spec keys arrive as jsonb identifiers like
    // "peakJointTorqueNm", and an eyebrow label reading PEAKJOINTTORQUENM
    // is not a label. Consecutive capitals (an acronym) stay together.
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * How each finish reads to a person.
 *
 * These live here rather than beside the badge that first needed them because
 * they are display strings, and there is now a second surface — the newsletter
 * — that has to say exactly the same words. Two copies would drift, and the
 * failure is quiet: "KO" on the site and "Ko" in the email, spotted by nobody
 * until a reader notices the site cannot keep its own vocabulary straight.
 *
 * `humanize()` cannot do this job: it would produce "Ko", "Tko" and "Dq".
 */
export const METHOD_LABELS: Record<BoutMethodValue, string> = {
  ko: "KO",
  tko: "TKO",
  decision: "Decision",
  draw: "Draw",
  dq: "DQ",
  no_contest: "No contest",
};
