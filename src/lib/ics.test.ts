import { describe, expect, it } from "vitest";

import {
  buildEventIcs,
  escapeIcsText,
  foldLine,
  nextIcsDate,
  toIcsDate,
  toIcsStamp,
} from "./ics";

const encoder = new TextEncoder();

describe("ics", () => {
  it("stamps UTC in the required format", () => {
    expect(toIcsStamp(new Date("2026-09-20T20:30:58.123Z"))).toBe(
      "20260920T203058Z",
    );
  });

  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeIcsText("Meridian Hall, Singapore")).toBe(
      "Meridian Hall\\, Singapore",
    );
    expect(escapeIcsText("a;b")).toBe("a\\;b");
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2");
  });

  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Short")).toBe("SUMMARY:Short");
  });

  it("folds long ASCII lines to 75 octets with a space prefix", () => {
    const line = `SUMMARY:${"a".repeat(200)}`;
    const folded = foldLine(line).split("\r\n");
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    }
    // Continuation lines must begin with a single space.
    for (const part of folded.slice(1)) {
      expect(part.startsWith(" ")).toBe(true);
    }
    // Unfolding reproduces the original exactly.
    expect(folded.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(line);
  });

  it("counts octets, not code units, for multi-byte characters", () => {
    // Em dashes are 3 bytes each. 30 of them is 90 octets but only 30 JS
    // characters — a length-based fold would not fire at all and would emit a
    // line well over the limit.
    const line = `SUMMARY:${"—".repeat(30)}`;
    expect(line.length).toBeLessThan(75);
    expect(encoder.encode(line).length).toBeGreaterThan(75);

    const folded = foldLine(line).split("\r\n");
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    }
  });

  it("never splits a surrogate pair", () => {
    // Each of these is 4 octets and two JS code units. Slicing by code unit
    // can cut one in half and produce invalid UTF-8.
    const line = `SUMMARY:${"🤖".repeat(40)}`;
    const folded = foldLine(line).split("\r\n");

    // A valid emoji IS a surrogate pair, so the check is for a LONE surrogate:
    // a high one not followed by a low, or a low one not preceded by a high.
    const loneSurrogate =
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

    for (const part of folded) {
      // A lone surrogate round-trips through encode/decode as U+FFFD, so this
      // catches the corruption even if the regex ever misses a case.
      const roundTripped = new TextDecoder().decode(encoder.encode(part));
      expect(roundTripped).toBe(part);
      expect(part).not.toMatch(loneSurrogate);
    }
    expect(folded.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(line);
  });

  it("builds a complete calendar with CRLF endings", () => {
    const ics = buildEventIcs({
      uid: "event-4@roboxing",
      start: new Date("2026-09-20T20:30:58Z"),
      end: new Date("2026-09-20T23:00:58Z"),
      summary: "Exhibition Night 2",
      description: "Roboxing Exhibition Season 1",
      location: "Meridian Hall, Singapore, SG",
      url: "https://roboxing.vercel.app/watch/exhibition-night-2",
      stamp: new Date("2026-08-30T20:47:49Z"),
    });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    // No bare LF anywhere.
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
    expect(ics).toContain("LOCATION:Meridian Hall\\, Singapore\\, SG");
    expect(ics).toContain("UID:event-4@roboxing");
    expect(ics).toContain("DTSTART:20260920T203058Z");
  });

  it("omits optional fields rather than emitting empty ones", () => {
    const ics = buildEventIcs({
      uid: "u",
      start: new Date("2026-01-01T00:00:00Z"),
      end: new Date("2026-01-01T01:00:00Z"),
      summary: "Bare",
      stamp: new Date("2026-01-01T00:00:00Z"),
    });
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("URL:");
  });
});

describe("all-day entries", () => {
  it("takes the date from the VENUE's zone, not UTC", () => {
    // Behind UTC: an American evening card. 8:00 PM on 9 September in New York
    // is already 10 September in UTC, so the naive read lands a day LATE.
    const usEvening = new Date("2026-09-09T20:00:00-04:00");
    expect(toIcsDate(usEvening, "America/New_York")).toBe("20260909");
    expect(toIcsDate(usEvening, "UTC")).toBe("20260910");

    // Ahead of UTC: an Asian late-night card. 12:30 AM on 10 September in
    // Riyadh is still 9 September in UTC, so the naive read lands a day EARLY.
    // Both directions are wrong, which is why the zone is a parameter rather
    // than an assumption.
    const riyadhLateNight = new Date("2026-09-10T00:30:00+03:00");
    expect(toIcsDate(riyadhLateNight, "Asia/Riyadh")).toBe("20260910");
    expect(toIcsDate(riyadhLateNight, "UTC")).toBe("20260909");
  });

  it("rolls the exclusive end date over month and year boundaries", () => {
    expect(nextIcsDate("20260909")).toBe("20260910");
    expect(nextIcsDate("20260930")).toBe("20261001");
    expect(nextIcsDate("20261231")).toBe("20270101");
    // A leap year, which is where hand-rolled date arithmetic usually breaks.
    expect(nextIcsDate("20280228")).toBe("20280229");
  });

  it("emits VALUE=DATE with an exclusive end, and no timestamps", () => {
    const ics = buildEventIcs({
      uid: "event-9@roboxing",
      start: new Date("2026-09-09T21:00:00+03:00"),
      end: new Date("2026-09-09T23:30:00+03:00"),
      summary: "Riyadh",
      allDay: true,
      timeZone: "Asia/Riyadh",
      stamp: new Date("2026-09-07T00:00:00Z"),
    });

    expect(ics).toContain("DTSTART;VALUE=DATE:20260909");
    // The day AFTER — an all-day range is end-exclusive, and a same-day end
    // produces a zero-length entry that some clients drop silently.
    expect(ics).toContain("DTEND;VALUE=DATE:20260910");
    // The timed forms must be gone entirely, not merely unused.
    expect(ics).not.toContain("DTSTART:2026");
    expect(ics).not.toContain("DTEND:2026");
  });

  it("still emits timestamps when allDay is not set", () => {
    const ics = buildEventIcs({
      uid: "u",
      start: new Date("2026-09-09T18:00:00Z"),
      end: new Date("2026-09-09T20:30:00Z"),
      summary: "Timed",
      stamp: new Date("2026-09-07T00:00:00Z"),
    });
    expect(ics).toContain("DTSTART:20260909T180000Z");
    expect(ics).not.toContain("VALUE=DATE");
  });
});
