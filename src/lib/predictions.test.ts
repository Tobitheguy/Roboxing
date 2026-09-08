import { describe, expect, it } from "vitest";

import {
  arePicksOpen,
  crowdSplit,
  gradePrediction,
  summarizeRecord,
} from "./predictions";

const NOW = new Date("2026-09-09T12:00:00Z");
const LATER = new Date("2026-09-09T20:00:00Z");
const EARLIER = new Date("2026-09-09T08:00:00Z");

describe("arePicksOpen", () => {
  it("is open before a scheduled event starts", () => {
    expect(arePicksOpen({ startsAt: LATER, status: "scheduled" }, NOW)).toBe(
      true,
    );
  });

  it("closes the moment the start time passes, without anyone doing anything", () => {
    // The important half: it does not depend on an admin remembering to flip
    // a switch mid-broadcast.
    expect(arePicksOpen({ startsAt: EARLIER, status: "scheduled" }, NOW)).toBe(
      false,
    );
    expect(arePicksOpen({ startsAt: NOW, status: "scheduled" }, NOW)).toBe(
      false,
    );
  });

  it("stays closed for a live, completed or cancelled event even if the clock disagrees", () => {
    // A rescheduled event could carry a future startsAt while already live.
    // Status wins — otherwise picks reopen mid-fight.
    for (const status of ["live", "completed", "cancelled"] as const) {
      expect(arePicksOpen({ startsAt: LATER, status }, NOW)).toBe(false);
    }
  });
});

describe("gradePrediction", () => {
  it("is pending with no result", () => {
    expect(gradePrediction(1, null)).toBe("pending");
  });

  it("is correct when the pick won", () => {
    expect(gradePrediction(1, { winnerRobotId: 1, method: "ko" })).toBe(
      "correct",
    );
  });

  it("is wrong when the other robot won", () => {
    expect(gradePrediction(1, { winnerRobotId: 2, method: "decision" })).toBe(
      "wrong",
    );
  });

  it("voids a draw and a no contest rather than counting them as losses", () => {
    // Neither of the two answers on offer happened, so scoring it against the
    // player would punish them for the one outcome they could not pick.
    expect(gradePrediction(1, { winnerRobotId: null, method: "draw" })).toBe(
      "void",
    );
    expect(
      gradePrediction(1, { winnerRobotId: null, method: "no_contest" }),
    ).toBe("void");
  });

  it("voids a decisive method with no winner recorded rather than calling it wrong", () => {
    // Should not occur — a CHECK constraint forbids it — but if a row ever got
    // there, marking every pick on it wrong would corrupt every player's
    // record at once.
    expect(gradePrediction(1, { winnerRobotId: null, method: "ko" })).toBe(
      "void",
    );
  });

  it("counts a DQ win like any other win", () => {
    expect(gradePrediction(7, { winnerRobotId: 7, method: "dq" })).toBe(
      "correct",
    );
  });
});

describe("summarizeRecord", () => {
  it("reports null accuracy before anything settles, not zero", () => {
    const record = summarizeRecord(["pending", "pending", "void"]);
    expect(record.accuracy).toBeNull();
    expect(record.settled).toBe(0);
    expect(record.pending).toBe(2);
    expect(record.void).toBe(1);
  });

  it("excludes void and pending picks from accuracy", () => {
    // 2 of 3 settled, with two voids and a pending that must not dilute it.
    const record = summarizeRecord([
      "correct",
      "correct",
      "wrong",
      "void",
      "void",
      "pending",
    ]);
    expect(record.settled).toBe(3);
    expect(record.accuracy).toBeCloseTo(2 / 3);
  });

  it("handles a perfect and a hopeless record", () => {
    expect(summarizeRecord(["correct", "correct"]).accuracy).toBe(1);
    expect(summarizeRecord(["wrong"]).accuracy).toBe(0);
  });
});

describe("crowdSplit", () => {
  it("is null when nobody has picked, rather than dividing by zero", () => {
    expect(crowdSplit(0, 0)).toBeNull();
  });

  it("always sums to exactly 100", () => {
    // Rounding each side independently is what produces "33% / 67%" adding to
    // 99 or 101 on a public page.
    for (const [a, b] of [
      [1, 2],
      [1, 1],
      [2, 1],
      [1, 0],
      [7, 3],
      [1, 6],
      [999, 1],
      [5, 4],
    ]) {
      const split = crowdSplit(a, b)!;
      expect(split.percentA + split.percentB).toBe(100);
      expect(split.total).toBe(a + b);
    }
  });

  it("gives the majority to the side with more picks", () => {
    const split = crowdSplit(7, 3)!;
    expect(split.percentA).toBe(70);
    expect(split.percentB).toBe(30);
  });
});
