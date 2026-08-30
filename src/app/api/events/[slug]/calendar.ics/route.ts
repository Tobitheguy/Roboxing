import { getEventBySlug } from "@/lib/queries";

/**
 * An .ics file for one event.
 *
 * This is the countdown hero's call to action. It gives a visitor a real
 * reason to come back without a fan account, a subscribers table, an email
 * provider, or an unsubscribe flow — which is what "set a reminder" would
 * otherwise have required, all of it outside V1's admin-only scope.
 */

/** Events run about this long. The organizer does not publish an end time. */
const ASSUMED_DURATION_MINUTES = 150;

/** RFC 5545 wants UTC timestamps as YYYYMMDDTHHMMSSZ. */
function toIcsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * RFC 5545 text escaping: backslash, semicolon, comma, and newlines.
 * An unescaped comma in a venue name silently truncates the field in some
 * calendar clients, which is the kind of bug nobody reports.
 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets must be folded with a leading space. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length) chunks.push(` ${rest}`);
  return chunks.join("\r\n");
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const row = await getEventBySlug(slug);

  if (!row) {
    return new Response("Event not found", { status: 404 });
  }

  const { event, competitionName } = row;
  const start = event.startsAt;
  const end = new Date(start.getTime() + ASSUMED_DURATION_MINUTES * 60_000);

  const location = [event.venue, event.city, event.country]
    .filter(Boolean)
    .join(", ");

  const appUrl = process.env.APP_URL ?? "https://roboxing.vercel.app";
  const url = `${appUrl}/watch/${event.slug}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Roboxing//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable across regenerations so re-adding updates the existing entry
    // rather than creating a duplicate in the viewer's calendar.
    `UID:event-${event.id}@roboxing`,
    `DTSTAMP:${toIcsStamp(new Date())}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${escapeIcsText(event.name)}`,
    `DESCRIPTION:${escapeIcsText(`${competitionName} — watch at ${url}`)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : null,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);

  // CRLF is mandatory in RFC 5545 — LF-only files are rejected outright by
  // some desktop clients.
  const body = lines.map(foldLine).join("\r\n") + "\r\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      // Short cache: the file changes if the event is rescheduled.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
