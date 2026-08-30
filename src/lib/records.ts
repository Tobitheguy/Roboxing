import type { BoutMethodValue } from "@/db/schema";

export type RobotRecord = {
  won: number;
  lost: number;
  drawn: number;
  /** Wins by KO or TKO. */
  ko: number;
  /** Bouts that actually counted. Excludes unresolved and no contests. */
  fought: number;
};

/** The minimum a bout needs to expose for a record to be computed from it. */
export type RecordBout = {
  robotA: { id: number };
  robotB: { id: number };
  result: {
    winnerRobotId: number | null;
    method: BoutMethodValue;
  } | null;
};

const DECISIVE: ReadonlySet<BoutMethodValue> = new Set([
  "ko",
  "tko",
  "decision",
  "dq",
]);
const FINISH: ReadonlySet<BoutMethodValue> = new Set(["ko", "tko"]);

/**
 * A single robot's W-L-D record.
 *
 * Deliberately follows the same rules as the standings computation: an
 * unresolved bout and a no contest both contribute nothing, and only a KO or
 * TKO counts as a finish. If these two ever disagreed, a robot's profile would
 * contradict its team's league position and there would be no way to tell
 * which was lying.
 */
export function computeRobotRecord(
  robotId: number,
  boutList: RecordBout[],
): RobotRecord {
  const record: RobotRecord = { won: 0, lost: 0, drawn: 0, ko: 0, fought: 0 };
  const seen = new Set<RecordBout>();

  for (const bout of boutList) {
    if (seen.has(bout)) continue;
    seen.add(bout);

    if (!bout.result) continue;
    const { method, winnerRobotId } = bout.result;
    if (method === "no_contest") continue;

    const isParticipant =
      bout.robotA.id === robotId || bout.robotB.id === robotId;
    if (!isParticipant) continue;

    if (method === "draw") {
      record.fought += 1;
      record.drawn += 1;
      continue;
    }

    if (!DECISIVE.has(method) || winnerRobotId == null) continue;

    // The winner must have actually been in this bout — nothing in the
    // database can enforce that, so it is checked here as it is in standings.
    if (
      winnerRobotId !== bout.robotA.id &&
      winnerRobotId !== bout.robotB.id
    ) {
      continue;
    }

    record.fought += 1;
    if (winnerRobotId === robotId) {
      record.won += 1;
      if (FINISH.has(method)) record.ko += 1;
    } else {
      record.lost += 1;
    }
  }

  return record;
}

/** What a bout must expose for a TEAM record to be computed from it. */
export type TeamRecordBout = {
  robotA: { id: number; teamId: number };
  robotB: { id: number; teamId: number };
  result: RecordBout["result"];
};

/**
 * One team's W-L-D record across a set of bouts.
 *
 * Exists so no page hand-rolls this. A team total written inline looks trivial
 * — "if our robot won, add a win" — and quietly gets two cases wrong that the
 * league table gets right:
 *
 *   1. A `winner_robot_id` naming a robot from NEITHER side. Postgres cannot
 *      enforce that (a CHECK cannot reach another table), so the guard has to
 *      live in code. An inline `winner === ourRobot ? won : lost` charges the
 *      team a loss for a bout that should count for nothing.
 *   2. Both robots belonging to the SAME team. Nothing in the schema forbids
 *      it, and `isA ? robotA : robotB` silently drops the other side.
 *
 * Either one makes a team page disagree with the standings for the same row,
 * with no way for a reader to tell which is lying.
 */
export function computeTeamRecord(
  teamId: number,
  boutList: TeamRecordBout[],
): RobotRecord {
  const record: RobotRecord = { won: 0, lost: 0, drawn: 0, ko: 0, fought: 0 };
  const seen = new Set<TeamRecordBout>();

  for (const bout of boutList) {
    if (seen.has(bout)) continue;
    seen.add(bout);

    if (!bout.result) continue;
    const { method, winnerRobotId } = bout.result;
    if (method === "no_contest") continue;

    // Both sides, in case this team owns both corners.
    const sides = [bout.robotA, bout.robotB].filter((r) => r.teamId === teamId);
    if (sides.length === 0) continue;

    if (method === "draw") {
      // sides.length is 2 when the team supplied both corners.
      record.fought += sides.length;
      record.drawn += sides.length;
      continue;
    }

    if (!DECISIVE.has(method) || winnerRobotId == null) continue;
    if (winnerRobotId !== bout.robotA.id && winnerRobotId !== bout.robotB.id) {
      continue;
    }

    for (const side of sides) {
      record.fought += 1;
      if (winnerRobotId === side.id) {
        record.won += 1;
        if (FINISH.has(method)) record.ko += 1;
      } else {
        record.lost += 1;
      }
    }
  }

  return record;
}

/**
 * Records for every robot that appears in a set of bouts, best first.
 *
 * Used for the home page's form guide. Ranks on wins, then finishes, then
 * fewest losses — a robot with 3 KO wins is a better watch than one with 3
 * decisions, and the home page's job is to point at the interesting fight.
 */
export function rankRobotsByRecord<
  T extends {
    robotA: { id: number } & Record<string, unknown>;
    robotB: { id: number } & Record<string, unknown>;
    result: RecordBout["result"];
  },
>(boutList: T[], limit?: number) {
  const participants = new Map<number, T["robotA"] | T["robotB"]>();
  for (const bout of boutList) {
    participants.set(bout.robotA.id, bout.robotA);
    participants.set(bout.robotB.id, bout.robotB);
  }

  const ranked = [...participants.values()]
    .map((robot) => ({
      robot,
      record: computeRobotRecord(robot.id as number, boutList),
    }))
    .filter((r) => r.record.fought > 0)
    .sort(
      (a, b) =>
        b.record.won - a.record.won ||
        b.record.ko - a.record.ko ||
        a.record.lost - b.record.lost ||
        String(a.robot.name).localeCompare(String(b.robot.name)),
    );

  return limit == null ? ranked : ranked.slice(0, limit);
}

/** "8–1–1" or "8–1" when there are no draws. Uses en dashes, not hyphens. */
export function formatRecord(record: RobotRecord): string {
  return record.drawn > 0
    ? `${record.won}–${record.lost}–${record.drawn}`
    : `${record.won}–${record.lost}`;
}
