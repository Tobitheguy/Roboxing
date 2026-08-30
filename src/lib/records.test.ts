import { describe, expect, it } from "vitest";

import {
  computeRobotRecord,
  formatRecord,
  type RecordBout,
} from "./records";

/**
 * A robot's record must follow exactly the same rules as the league table. If
 * they ever diverge, a robot profile contradicts its team's standing and there
 * is no way to tell which one is lying.
 */

const A = { id: 11 };
const B = { id: 21 };
const C = { id: 31 };

const bout = (
  a: { id: number },
  b: { id: number },
  result: RecordBout["result"],
): RecordBout => ({ robotA: a, robotB: b, result });

describe("computeRobotRecord", () => {
  it("counts wins, losses, draws and finishes", () => {
    const record = computeRobotRecord(A.id, [
      bout(A, B, { winnerRobotId: A.id, method: "ko" }),
      bout(A, C, { winnerRobotId: A.id, method: "decision" }),
      bout(B, A, { winnerRobotId: B.id, method: "tko" }),
      bout(A, C, { winnerRobotId: null, method: "draw" }),
    ]);
    expect(record).toEqual({ won: 2, lost: 1, drawn: 1, ko: 1, fought: 4 });
  });

  it("ignores unresolved bouts", () => {
    const record = computeRobotRecord(A.id, [
      bout(A, B, { winnerRobotId: A.id, method: "ko" }),
      bout(A, B, null),
    ]);
    expect(record.fought).toBe(1);
    expect(record.won).toBe(1);
  });

  it("ignores a no contest", () => {
    const record = computeRobotRecord(A.id, [
      bout(A, B, { winnerRobotId: null, method: "no_contest" }),
    ]);
    expect(record.fought).toBe(0);
  });

  it("does not count a DQ win as a finish", () => {
    const record = computeRobotRecord(A.id, [
      bout(A, B, { winnerRobotId: A.id, method: "dq" }),
    ]);
    expect(record.won).toBe(1);
    expect(record.ko).toBe(0);
  });

  it("ignores a bout the robot did not take part in", () => {
    const record = computeRobotRecord(A.id, [
      bout(B, C, { winnerRobotId: B.id, method: "ko" }),
    ]);
    expect(record.fought).toBe(0);
  });

  it("ignores a result whose winner was in neither slot", () => {
    const record = computeRobotRecord(A.id, [
      bout(A, B, { winnerRobotId: C.id, method: "ko" }),
    ]);
    expect(record).toEqual({ won: 0, lost: 0, drawn: 0, ko: 0, fought: 0 });
  });

  it("formats records with an en dash, omitting draws when there are none", () => {
    expect(formatRecord({ won: 8, lost: 1, drawn: 0, ko: 5, fought: 9 })).toBe(
      "8–1",
    );
    expect(formatRecord({ won: 8, lost: 1, drawn: 2, ko: 5, fought: 11 })).toBe(
      "8–1–2",
    );
  });
});
