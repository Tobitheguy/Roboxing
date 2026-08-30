import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  boutResults,
  bouts,
  competitions,
  pointsRules,
  robots,
  teams,
  type BoutMethodValue,
} from "@/db/schema";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type PointsConfig = {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  /** Added on top of win points when a bout is finished by KO or TKO. */
  koBonusPoints: number;
};

export const DEFAULT_POINTS: PointsConfig = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  koBonusPoints: 1,
};

export type StandingsTeam = {
  id: number;
  name: string;
  slug: string;
};

export type StandingsBout = {
  boutId: number;
  robotAId: number;
  robotBId: number;
  teamAId: number;
  teamBId: number;
  /** Null when the bout has not been resolved. Such a bout scores nothing. */
  result: {
    winnerRobotId: number | null;
    method: BoutMethodValue;
  } | null;
};

export type StandingRow = {
  position: number;
  team: StandingsTeam;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  /** Wins by KO or TKO. Displayed, and the basis of the finish bonus. */
  ko: number;
  points: number;
};

/* -------------------------------------------------------------------------- */
/* The computation                                                             */
/* -------------------------------------------------------------------------- */

/** Methods that end a bout with a winner and a loser. */
const DECISIVE: ReadonlySet<BoutMethodValue> = new Set([
  "ko",
  "tko",
  "decision",
  "dq",
]);

/**
 * Methods that count as a finish and earn the KO bonus.
 *
 * A DQ is deliberately excluded. It is a win, but it is not a finish — the
 * bonus exists to reward stopping the other robot, and awarding it for an
 * opponent's rule violation would pay a team for something it did not do.
 */
const FINISH: ReadonlySet<BoutMethodValue> = new Set(["ko", "tko"]);

/**
 * Build a league table from bout results.
 *
 * Pure by design: no database, no clock, no I/O. Standings correctness is the
 * one thing on this site that must never be wrong — a bad table is visible on
 * the home page, the team page, and every robot's record simultaneously — so
 * it is written as a function that can be exhaustively tested against fixtures
 * rather than as a SQL aggregate that can only be checked against a live
 * database.
 *
 * Bouts are at season scale (hundreds), so aggregating in memory costs nothing
 * measurable and buys a test suite.
 */
export function computeStandings({
  teams: teamList,
  bouts: boutList,
  rules,
}: {
  teams: StandingsTeam[];
  bouts: StandingsBout[];
  rules: PointsConfig;
}): StandingRow[] {
  // Seed every team at zero. A team that has not fought yet must appear in the
  // table as P0 rather than vanishing from it.
  const acc = new Map<
    number,
    Omit<StandingRow, "position" | "team"> & { team: StandingsTeam }
  >();

  for (const team of teamList) {
    acc.set(team.id, {
      team,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      ko: 0,
      points: 0,
    });
  }

  const bump = (
    teamId: number,
    fn: (row: NonNullable<ReturnType<typeof acc.get>>) => void,
  ) => {
    const row = acc.get(teamId);
    // A bout referencing a team outside the supplied list is skipped rather
    // than fabricated — silently inventing a row would hide a data problem.
    if (row) fn(row);
  };

  // Defence against a join fan-out upstream producing the same bout twice.
  // The UNIQUE constraint on bout_results.bout_id makes duplicates impossible
  // in storage, but a mis-written join could still hand us two copies, and a
  // silently doubled league table is the worst possible failure here: it looks
  // plausible. Counting each bout once is one line and removes the class.
  const seen = new Set<number>();

  for (const bout of boutList) {
    if (seen.has(bout.boutId)) continue;
    seen.add(bout.boutId);

    // An unresolved bout contributes nothing at all: not a point, not an
    // appearance in the "played" column. It has not happened yet.
    if (!bout.result) continue;

    const { method, winnerRobotId } = bout.result;

    // A no contest is expunged, not drawn. It awards nothing and does not
    // count as played — which is precisely why it cannot share a code path
    // with `draw`.
    if (method === "no_contest") continue;

    if (method === "draw") {
      bump(bout.teamAId, (r) => {
        r.played += 1;
        r.drawn += 1;
        r.points += rules.drawPoints;
      });
      bump(bout.teamBId, (r) => {
        r.played += 1;
        r.drawn += 1;
        r.points += rules.drawPoints;
      });
      continue;
    }

    if (!DECISIVE.has(method) || winnerRobotId == null) {
      // Defensive: the database CHECK constraint makes this unreachable, but
      // scoring a decisive method with no winner as anything at all would be
      // worse than skipping it.
      continue;
    }

    const winnerIsA = winnerRobotId === bout.robotAId;
    const winnerTeamId = winnerIsA ? bout.teamAId : bout.teamBId;
    const loserTeamId = winnerIsA ? bout.teamBId : bout.teamAId;
    const isFinish = FINISH.has(method);

    bump(winnerTeamId, (r) => {
      r.played += 1;
      r.won += 1;
      r.points += rules.winPoints + (isFinish ? rules.koBonusPoints : 0);
      if (isFinish) r.ko += 1;
    });
    bump(loserTeamId, (r) => {
      r.played += 1;
      r.lost += 1;
      r.points += rules.lossPoints;
    });
  }

  return [...acc.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.won - a.won ||
        b.ko - a.ko ||
        // Name last so the order is fully deterministic — two teams level on
        // every metric must not swap places between page loads.
        a.team.name.localeCompare(b.team.name),
    )
    .map((row, i) => ({ ...row, position: i + 1 }));
}

/* -------------------------------------------------------------------------- */
/* The query                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Load one competition's bouts and compute its table.
 *
 * Nothing here is cached or stored: enter a result once and the league table,
 * the team page, and the robot's record all move together because they are all
 * reading the same rows.
 */
export async function getStandings(competitionId: number): Promise<StandingRow[]> {
  const robotA = alias(robots, "robot_a");
  const robotB = alias(robots, "robot_b");
  const teamA = alias(teams, "team_a");
  const teamB = alias(teams, "team_b");

  const rows = await db
    .select({
      boutId: bouts.id,
      robotAId: bouts.robotAId,
      robotBId: bouts.robotBId,
      teamA: { id: teamA.id, name: teamA.name, slug: teamA.slug },
      teamB: { id: teamB.id, name: teamB.name, slug: teamB.slug },
      winnerRobotId: boutResults.winnerRobotId,
      method: boutResults.method,
    })
    .from(bouts)
    .innerJoin(robotA, eq(bouts.robotAId, robotA.id))
    .innerJoin(robotB, eq(bouts.robotBId, robotB.id))
    .innerJoin(teamA, eq(robotA.teamId, teamA.id))
    .innerJoin(teamB, eq(robotB.teamId, teamB.id))
    // LEFT join: an unresolved bout still appears, with a null result. The
    // computation is what decides it scores nothing, not the query.
    .leftJoin(boutResults, eq(boutResults.boutId, bouts.id))
    .where(eq(bouts.competitionId, competitionId));

  const rule = await db.query.pointsRules.findFirst({
    where: eq(pointsRules.competitionId, competitionId),
  });

  // Participating teams are derived from the bouts rather than from a
  // membership table — a team is in the competition because it has a robot
  // booked in it, which is the only definition the data actually supports.
  const teamMap = new Map<number, StandingsTeam>();
  for (const r of rows) {
    teamMap.set(r.teamA.id, r.teamA);
    teamMap.set(r.teamB.id, r.teamB);
  }

  return computeStandings({
    teams: [...teamMap.values()],
    bouts: rows.map((r) => ({
      boutId: r.boutId,
      robotAId: r.robotAId,
      robotBId: r.robotBId,
      teamAId: r.teamA.id,
      teamBId: r.teamB.id,
      result: r.method ? { winnerRobotId: r.winnerRobotId, method: r.method } : null,
    })),
    rules: rule ?? DEFAULT_POINTS,
  });
}

/** Convenience for pages that only have the slug. */
export async function getStandingsBySlug(slug: string): Promise<StandingRow[]> {
  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.slug, slug),
  });
  if (!competition) return [];
  return getStandings(competition.id);
}
