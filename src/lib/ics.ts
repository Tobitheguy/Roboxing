/**
 * Minimal RFC 5545 generation for a single event.
 *
 * Lives in lib rather than in the route file so it can be unit tested — a
 * Next route module may only export handlers, and a calendar file that a
 * client silently rejects is exactly the kind of bug nobody reports.
 */

const encoder = new TextEncoder();

/**
 * How long an event is assumed to run. Organizers do not publish an end time.
 * Defined once here because both the .ics route and the Google Calendar link
 * need it, and two hand-synced copies would drift.
 */
export const ASSUMED_DURATION_MINUTES = 150;

/** The assumed end of an event starting at `start`. */
export function assumedEnd(start: Date): Date {
  return new Date(start.getTime() + ASSUMED_DURATION_MINUTES * 60_000);
}

/** RFC 5545 wants UTC timestamps as YYYYMMDDTHHMMSSZ. */
export function toIcsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escape TEXT values: backslash, semicolon, comma, and newlines.
 *
 * An unescaped comma in a venue name silently truncates the field in some
 * clients — "Meridian Hall, Singapore" becomes "Meridian Hall".
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold lines longer than 75 OCTETS, continuation lines prefixed with a space.
 *
 * Octets, not JavaScript string length — those diverge the moment a value
 * contains anything outside ASCII. Slicing by code unit can cut a surrogate
 * pair in half (one emoji in an event name is enough) and emit invalid UTF-8,
 * which some clients reject and others render as mojibake. Iterating with
 * for..of walks code points, so a character is never split.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;

  const lines: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      lines.push(current);
      // The leading space of a continuation line counts toward its 75.
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  if (current) lines.push(current);

  return lines.join("\r\n");
}

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string | null;
  url?: string;
  /**
   * CANCELLED tells the calendar client to strike the entry through rather
   * than leave a normal-looking invite for an event that is not happening.
   */
  status?: "CONFIRMED" | "CANCELLED";
  /** Injected rather than read from the clock, so output is testable. */
  stamp?: Date;
};

export function buildEventIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Roboxing//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsStamp(event.stamp ?? new Date())}`,
    `DTSTART:${toIcsStamp(event.start)}`,
    `DTEND:${toIcsStamp(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    event.url ? `URL:${event.url}` : null,
    `STATUS:${event.status ?? "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);

  // CRLF is mandatory in RFC 5545 — LF-only files are rejected outright by
  // some desktop clients.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
