import { EventTime } from "@/components/event-time";
import { formatDateLong } from "@/lib/format";
import { safeTimeZone } from "@/lib/timezones";

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
        {formatRange(startsAt, endsAt, timeZone)}
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
  return `${formatDateLong(start, zone)} – ${formatDateLong(end, zone)}`;
}
