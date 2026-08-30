import { describe, expect, it } from "vitest";

import {
  computeRobotRecord,
  computeTeamRecord,
  formatRecord,
  type RecordBout,
  type TeamRecordBout,
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

/* -------------------------------------------------------------------------- */

describe("computeTeamRecord", () => {
  const OURS = 1;
  const THEIRS = 2;

  // Our robots: 11, 12. Theirs: 21.
  const a = { id: 11, teamId: OURS };
  const a2 = { id: 12, teamId: OURS };
  const b = { id: 21, teamId: THEIRS };

  const bout = (
    ra: { id: number; teamId: number },
    rb: { id: number; teamId: number },
    result: TeamRecordBout["result"],
  ): TeamRecordBout => ({ robotA: ra, robotB: rb, result });

  it("counts wins, losses, draws and finishes for the team", () => {
    expect(
      computeTeamRecord(OURS, [
        bout(a, b, { winnerRobotId: a.id, method: "ko" }),
        bout(b, a, { winnerRobotId: b.id, method: "decision" }),
        bout(a, b, { winnerRobotId: null, method: "draw" }),
      ]),
    ).toEqual({ won: 1, lost: 1, drawn: 1, ko: 1, fought: 3 });
  });

  it("scores our robot as the winner when it is in the B corner", () => {
    expect(
      computeTeamRecord(OURS, [
        bout(b, a, { winnerRobotId: a.id, method: "tko" }),
      ]),
    ).toEqual({ won: 1, lost: 0, drawn: 0, ko: 1, fought: 1 });
  });

  it("does not pay the finish bonus count for a DQ", () => {
    const record = computeTeamRecord(OURS, [
      bout(a, b, { winnerRobotId: a.id, method: "dq" }),
    ]);
    expect(record.won).toBe(1);
    expect(record.ko).toBe(0);
  });

  it("ignores a result whose winner fought in neither corner", () => {
    // Postgres cannot enforce this — a CHECK cannot reference another table.
    // An inline `winner === ourRobot ? won : lost` would charge us a LOSS here.
    expect(
      computeTeamRecord(OURS, [
        bout(a, b, { winnerRobotId: 999, method: "ko" }),
      ]),
    ).toEqual({ won: 0, lost: 0, drawn: 0, ko: 0, fought: 0 });
  });

  it("counts both corners when the team fights itself", () => {
    // Nothing in the schema forbids team_a_id === team_b_id, and an
    // `isA ? robotA : robotB` shortcut silently drops the other side.
    expect(
      computeTeamRecord(OURS, [
        bout(a, a2, { winnerRobotId: a.id, method: "ko" }),
      ]),
    ).toEqual({ won: 1, lost: 1, drawn: 0, ko: 1, fought: 2 });
  });

  it("counts an intra-team draw for both corners", () => {
    expect(
      computeTeamRecord(OURS, [
        bout(a, a2, { winnerRobotId: null, method: "draw" }),
      ]),
    ).toEqual({ won: 0, lost: 0, drawn: 2, ko: 0, fought: 2 });
  });

  it("ignores unresolved bouts, no contests, and other teams' bouts", () => {
    expect(
      computeTeamRecord(OURS, [
        bout(a, b, null),
        bout(a, b, { winnerRobotId: null, method: "no_contest" }),
        bout(b, { id: 22, teamId: THEIRS }, {
          winnerRobotId: b.id,
          method: "ko",
        }),
      ]),
    ).toEqual({ won: 0, lost: 0, drawn: 0, ko: 0, fought: 0 });
  });

  it("agrees with the sum of its robots' individual records", () => {
    // The invariant that matters: a team page must never contradict the robot
    // pages it links to.
    const bouts = [
      bout(a, b, { winnerRobotId: a.id, method: "ko" }),
      bout(a2, b, { winnerRobotId: b.id, method: "decision" }),
      bout(a, b, { winnerRobotId: null, method: "draw" }),
    ];
    const team = computeTeamRecord(OURS, bouts);
    const r1 = computeRobotRecord(a.id, bouts);
    const r2 = computeRobotRecord(a2.id, bouts);

    expect(team.won).toBe(r1.won + r2.won);
    expect(team.lost).toBe(r1.lost + r2.lost);
    expect(team.drawn).toBe(r1.drawn + r2.drawn);
    expect(team.ko).toBe(r1.ko + r2.ko);
    expect(team.fought).toBe(r1.fought + r2.fought);
  });
});
