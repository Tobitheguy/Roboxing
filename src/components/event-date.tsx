import { EventTime } from "@/components/event-time";
import { safeTimeZone } from "@/lib/timezones";

/**
 * Which calendar a date-only event's date should be read in.
 *
 * THE BUG THIS EXISTS TO STOP: UFB's Season 2 is announced as starting
 * 1 October 2026. It is stored as `2026-10-01T00:00:00Z` with `startTimeTbd`,
 * because the clock part is ours and not theirs. Rendered in the venue's zone
 * — America/Los_Angeles — that instant is 5pm on 30 SEPTEMBER, and the site
 * announced a season starting a day before the promoter said it did.
 *
 * When the time was never published there is nothing to convert. The date is
 * the date somebody typed, and the zone it was typed in is UTC. Converting it
 * anywhere else invents a fact in the one direction nobody checks.
 *
 * A real instant — an event with an announced start time — still converts
 * normally. That conversion is the whole point of the dual clock.
 */
export function dateZone(timeZone: string, timeTbd: boolean): string {
  return timeTbd ? "UTC" : timeZone;
}

/**
 * When an event is, for the three cases that actually occur.
 *
 * 1. A known instant  → EventTime, which converts into the viewer's zone.
 * 2. A window         → "14–17 August 2025", one line, no conversion.
 * 3. Announced only   → the label the announcement gave, and nothing more.
 *
 * Case 3 is the whole reason this component exists. Six of CyberHero's eight
 * circuit stops are announced with no city and no date; URKL's grand final is
 * "December or January" in Dubai. Those rows still need a `starts_at` so the
 * calendar can order them, and rendering that placeholder instant as a date
 * would invent a fixture — the same failure as a countdown ticking down to a
 * time nobody published. When `dateTbd` is set, the stored instant is ours and
 * must never reach the page.
 */
export function EventDate({
  startsAt,
  endsAt,
  timeZone,
  city,
  dateTbd,
  dateLabel,
  startTimeTbd,
  className,
}: {
  startsAt: Date;
  endsAt?: Date | null;
  timeZone: string;
  city?: string | null;
  dateTbd: boolean;
  dateLabel?: string | null;
  startTimeTbd: boolean;
  className?: string;
}) {
  if (dateTbd) {
    return (
      <span className={className}>
        {dateLabel?.trim() || "Date to be announced"}
      </span>
    );
  }

  if (endsAt) {
    return (
      <span className={className}>
        {formatRange(startsAt, endsAt, dateZone(timeZone, startTimeTbd))}
      </span>
    );
  }

  return (
    <EventTime
      startsAt={startsAt.toISOString()}
      timeZone={timeZone}
      city={city}
      timeTbd={startTimeTbd}
      className={className}
    />
  );
}

/**
 * "14–17 August 2025", "1 October 2026 – 31 March 2027".
 *
 * Collapses the shared month or year rather than repeating it, because a
 * five-day tournament written out twice in full reads as two separate events.
 */
export function formatRange(start: Date, end: Date, timeZone: string): string {
  const zone = safeTimeZone(timeZone);
  const part = (date: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...opts, timeZone: zone }).format(date);

  const sameYear = part(start, { year: "numeric" }) === part(end, { year: "numeric" });
  const sameMonth =
    sameYear && part(start, { month: "long" }) === part(end, { month: "long" });

  if (sameMonth) {
    return `${part(start, { day: "numeric" })}–${part(end, { day: "numeric" })} ${part(end, { month: "long", year: "numeric" })}`;
  }
  if (sameYear) {
    return `${part(start, { month: "short", day: "numeric" })} – ${part(end, { month: "short", day: "numeric" })}, ${part(end, { year: "numeric" })}`;
  }
  // Across a year boundary: full dates, no weekday. A season running October
  // to March is not something anyone plans around by day of the week, and
  // "Wed," in front of each end is the noisiest possible way to say it.
  const full = { month: "long", day: "numeric", year: "numeric" } as const;
  return `${part(start, full)} – ${part(end, full)}`;
}
