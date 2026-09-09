import { describe, expect, it } from "vitest";

import { confirmUrl, isoWeekKey, unsubscribeUrl } from "./newsletter";

/**
 * The week key is the whole double-send defence.
 *
 * It has to be computable from the clock alone, so that two processes running
 * on the same Thursday derive the same string and exactly one of them wins the
 * UNIQUE insert. Anything relative to the previous send would let two racing
 * runs each conclude they were first — and the failure mode is the list
 * receiving the same mail twice, which cannot be undone.
 */
describe("isoWeekKey", () => {
  it("numbers a normal week", () => {
    expect(isoWeekKey(new Date("2026-09-08T00:00:00Z"))).toBe("2026-W37");
  });

  it("is stable across every day of the same ISO week", () => {
    // Monday through Sunday of ISO week 2026-W37.
    const days = [
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ];
    const keys = days.map((d) => isoWeekKey(new Date(`${d}T12:00:00Z`)));
    expect(new Set(keys)).toEqual(new Set(["2026-W37"]));
  });

  it("is unaffected by the time of day", () => {
    expect(isoWeekKey(new Date("2026-09-08T23:59:59Z"))).toBe(
      isoWeekKey(new Date("2026-09-08T00:00:01Z")),
    );
  });

  it("pads single-digit weeks so keys sort", () => {
    expect(isoWeekKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01");
  });

  /*
   * The reason this is not a one-liner. 1 January 2027 is a Friday, and ISO
   * puts it in week 53 OF 2026 — the year in the key is the year of that
   * week's Thursday, not the year of the date. A naive implementation emits
   * "2027-W01" here, which collides with the real 2027-W01 four days later and
   * silently suppresses that week's send.
   */
  it("assigns early January to the previous ISO year when it belongs there", () => {
    expect(isoWeekKey(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
  });
});

describe("link builders", () => {
  it("encode the token rather than splicing it in raw", () => {
    expect(confirmUrl("a b&c", "https://roboxing.tv")).toBe(
      "https://roboxing.tv/api/newsletter/confirm?token=a%20b%26c",
    );
  });

  it("point confirm and unsubscribe at different paths", () => {
    const base = "https://roboxing.tv";
    expect(confirmUrl("t", base)).not.toBe(unsubscribeUrl("t", base));
  });
});
