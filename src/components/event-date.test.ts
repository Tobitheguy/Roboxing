import { describe, expect, it } from "vitest";

import { formatRange } from "./event-date";

/**
 * Date windows.
 *
 * The schedule gained multi-day events — a five-day Games, a six-month UFB
 * season — and rendering those as a single instant made the calendar claim a
 * season was an evening. The collapsing rules are the fiddly part: a
 * five-day tournament with the month written out twice reads as two events.
 */
describe("formatRange", () => {
  it("collapses a range inside one month", () => {
    expect(
      formatRange(
        new Date("2025-08-14T00:00:00Z"),
        new Date("2025-08-17T23:59:59Z"),
        "UTC",
      ),
    ).toBe("14–17 August 2025");
  });

  it("keeps both months when they differ inside a year", () => {
    expect(
      formatRange(
        new Date("2026-09-15T00:00:00Z"),
        new Date("2026-10-31T00:00:00Z"),
        "UTC",
      ),
    ).toBe("Sep 15 – Oct 31, 2026");
  });

  it("writes both dates in full across a year boundary", () => {
    // UFB's season. The case their own site gets wrong: it displays
    // "October 1, 2027 – March 31, 2027", a window that ends five months
    // before it starts.
    const text = formatRange(
      new Date("2026-10-01T00:00:00Z"),
      new Date("2027-03-31T00:00:00Z"),
      "UTC",
    );
    expect(text).toContain("2026");
    expect(text).toContain("2027");
  });

  it("renders in the VENUE's zone, not the machine's", () => {
    // An instant that is 31 December in UTC and 1 January in Shanghai. The
    // schedule groups by the venue's calendar, so the year must follow the
    // venue — otherwise a Beijing event lands in the wrong year's heading.
    const instant = new Date("2026-12-31T18:00:00Z");
    expect(formatRange(instant, instant, "Asia/Shanghai")).toContain("2027");
    expect(formatRange(instant, instant, "UTC")).toContain("2026");
  });
});
