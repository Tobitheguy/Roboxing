import { describe, expect, it } from "vitest";

import { formatDaysUntil, formatUsd } from "./format";

describe("formatDaysUntil", () => {
  const now = new Date("2026-09-07T12:00:00Z");

  it("names today and tomorrow rather than counting them", () => {
    expect(formatDaysUntil(new Date("2026-09-07T23:00:00Z"), now)).toBe("Today");
    expect(formatDaysUntil(new Date("2026-09-08T01:00:00Z"), now)).toBe(
      "Tomorrow",
    );
  });

  it("counts days inside a fortnight", () => {
    expect(formatDaysUntil(new Date("2026-09-09T18:00:00Z"), now)).toBe(
      "in 2 days",
    );
    expect(formatDaysUntil(new Date("2026-09-19T12:00:00Z"), now)).toBe(
      "in 12 days",
    );
  });

  it("switches to weeks and then months, because an exact day count that far out is false precision", () => {
    expect(formatDaysUntil(new Date("2026-10-05T12:00:00Z"), now)).toBe(
      "in 4 weeks",
    );
    expect(formatDaysUntil(new Date("2026-12-20T12:00:00Z"), now)).toBe(
      "in 3 months",
    );
  });

  it("stays in weeks up to the eight-week mark", () => {
    // The boundary matters: the months branch is only reachable from 9 weeks
    // out, which is why the month count is never 1 and never singular.
    expect(formatDaysUntil(new Date("2026-10-09T12:00:00Z"), now)).toBe(
      "in 5 weeks",
    );
    expect(formatDaysUntil(new Date("2026-11-01T12:00:00Z"), now)).toBe(
      "in 8 weeks",
    );
    expect(formatDaysUntil(new Date("2026-11-09T12:00:00Z"), now)).toBe(
      "in 2 months",
    );
  });

  it("is null for anything already past", () => {
    expect(formatDaysUntil(new Date("2026-09-06T12:00:00Z"), now)).toBeNull();
    expect(formatDaysUntil(new Date("2025-01-01T00:00:00Z"), now)).toBeNull();
  });

  it("compares calendar days, not elapsed hours", () => {
    // 23:00 today and 01:00 tomorrow are two hours apart and must not both
    // read as "Today" — the label is about which day, not how long.
    const late = new Date("2026-09-07T23:59:00Z");
    const justAfter = new Date("2026-09-08T00:01:00Z");
    expect(formatDaysUntil(late, now)).toBe("Today");
    expect(formatDaysUntil(justAfter, now)).toBe("Tomorrow");
  });
});

import {
  dayOffset,
  formatClock,
  formatFinish,
  formatWeight,
  isoDateIn,
} from "./format";

describe("dayOffset", () => {
  // 2026-09-20T20:30Z. In Los Angeles that is 1:30 PM on the 20th; in
  // Singapore it is 4:30 AM on the 21st. Printing "Sep 21" beside "1:30 PM
  // PDT" sends a US viewer to the event a day late — the exact bug this
  // guards against.
  const instant = new Date("2026-09-20T20:30:00Z");

  it("reports the venue as a day ahead of a US viewer", () => {
    expect(dayOffset(instant, "America/Los_Angeles", "Asia/Singapore")).toBe(1);
  });

  it("reports the viewer as a day behind from the other direction", () => {
    expect(dayOffset(instant, "Asia/Singapore", "America/Los_Angeles")).toBe(-1);
  });

  it("reports no offset when both zones share the calendar day", () => {
    // Noon UTC is the same date everywhere from UTC-11 to UTC+12.
    const midday = new Date("2026-09-20T12:00:00Z");
    expect(dayOffset(midday, "America/Los_Angeles", "Asia/Singapore")).toBe(0);
    expect(dayOffset(midday, "America/New_York", "Europe/London")).toBe(0);
  });

  it("is zero for the same zone", () => {
    expect(dayOffset(instant, "Asia/Singapore", "Asia/Singapore")).toBe(0);
  });

  it("resolves the calendar date per zone", () => {
    expect(isoDateIn(instant, "Asia/Singapore")).toBe("2026-09-21");
    expect(isoDateIn(instant, "America/Los_Angeles")).toBe("2026-09-20");
    expect(isoDateIn(instant, "UTC")).toBe("2026-09-20");
  });
});

describe("formatClock", () => {
  it("renders seconds into a round as a clock", () => {
    expect(formatClock(74)).toBe("1:14");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(0)).toBe("0:00");
  });

  it("returns null for missing or negative values", () => {
    expect(formatClock(null)).toBeNull();
    expect(formatClock(undefined)).toBeNull();
    expect(formatClock(-1)).toBeNull();
  });
});

describe("formatFinish", () => {
  it("includes the round and clock when both are known", () => {
    expect(formatFinish("KO", 2, 74)).toBe("KO · R2 1:14");
  });

  it("drops the clock when only the round is known", () => {
    expect(formatFinish("TKO", 3, null)).toBe("TKO · R3");
  });

  it("is just the method when the round is unknown", () => {
    expect(formatFinish("Decision", null, null)).toBe("Decision");
  });
});

describe("formatWeight", () => {
  it("converts grams to kilograms", () => {
    // Stored in grams so a 62.5 kg robot needs no float in the database.
    expect(formatWeight(71_000)).toBe("71.0 kg");
    expect(formatWeight(62_500)).toBe("62.5 kg");
  });

  it("returns null when unknown", () => {
    expect(formatWeight(null)).toBeNull();
  });
});

/**
 * Machine prices.
 *
 * Every number on the Machines page is a press-release figure or an RMB
 * conversion at whatever rate an outlet used that day, so rendering cents would
 * claim precision the source does not have. And "not published" is a fact about
 * the manufacturer, not a hole in our data — it must not render as a dash.
 */
describe("formatUsd", () => {
  it("renders whole dollars with separators", () => {
    expect(formatUsd(63_900)).toBe("$63,900");
    expect(formatUsd(574_000)).toBe("$574,000");
  });

  it("never shows cents", () => {
    expect(formatUsd(33_949)).not.toContain(".");
  });

  it("says so when there is no published price", () => {
    expect(formatUsd(null)).toBe("Not published");
    expect(formatUsd(undefined)).toBe("Not published");
  });

  it("renders a free machine as $0, not as missing", () => {
    // URKL supplies the T800 at no cost. Zero and null mean different things
    // and a falsy check would collapse them.
    expect(formatUsd(0)).toBe("$0");
  });
});
