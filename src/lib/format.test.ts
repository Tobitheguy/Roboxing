import { describe, expect, it } from "vitest";

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
