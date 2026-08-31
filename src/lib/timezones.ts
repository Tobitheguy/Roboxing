/**
 * Which IANA timezone names are real.
 *
 * The event form used to take the zone as free text with a default of "UTC",
 * and nothing checked it. Two failures came out of that, found the first time
 * a real event was entered:
 *
 *   - An event at Madison Square Garden was saved as UTC, so the page would
 *     have shown "10:15 PM UTC" instead of "6:15 PM EDT". The entire premise
 *     of this product is viewer time beside venue time, and a default that is
 *     wrong for every venue on earth quietly defeats it.
 *
 *   - A typo like "America/NewYork" passes `z.string().max(64)` and then
 *     throws RangeError inside Intl at RENDER time — on the public watch page
 *     and in the landing hero. One character in an admin field could take down
 *     the home page.
 *
 * The list comes from the runtime rather than being hand-written, so it cannot
 * drift from what Intl will actually accept.
 */

let cached: string[] | null = null;

export function supportedTimeZones(): string[] {
  if (cached) return cached;
  // `supportedValuesOf` is ES2022 and present in Node 18+ and every browser we
  // support. The fallback exists so a missing implementation degrades to a
  // short usable list rather than an empty select.
  cached =
    typeof Intl.supportedValuesOf === "function"
      ? [...Intl.supportedValuesOf("timeZone")]
      : ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London"];
  return cached;
}

let lookup: Set<string> | null = null;

export function isValidTimeZone(value: string): boolean {
  if (!lookup) lookup = new Set(supportedTimeZones());
  if (lookup.has(value)) return true;

  // `supportedValuesOf` omits some legacy aliases that Intl still accepts
  // (e.g. "US/Eastern"). Ask Intl directly rather than refusing a name that
  // would in fact have worked.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * A zone that is safe to hand to Intl.
 *
 * Used at RENDER time as a last line of defence. Validation at the form stops
 * bad data getting in; this stops bad data already stored — or arriving from
 * an import — from throwing inside a component and taking a page with it.
 */
export function safeTimeZone(value: string | null | undefined): string {
  if (typeof value === "string" && value.length > 0 && isValidTimeZone(value)) {
    return value;
  }
  return "UTC";
}

/**
 * Zones grouped by region for a select, with the ones a US-focused product
 * reaches for first pulled to the top.
 */
export const COMMON_TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "UTC",
] as const;
