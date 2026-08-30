import { describe, expect, it } from "vitest";

import {
  computeStandings,
  DEFAULT_POINTS,
  type StandingsBout,
  type StandingsTeam,
} from "./standings";

/**
 * Standings correctness.
 *
 * This is the one calculation on the site that must never be wrong: a bad
 * table is visible on the home page, the competition page, the team page, and
 * every robot's record at the same time, and nobody would know which one to
 * believe. So the fixture below deliberately contains every case that scores
 * differently — a decision win, a KO, a draw, a DQ, a no contest, and an
 * unresolved bout — rather than a happy path.
 */

const ALPHA: StandingsTeam = { id: 1, name: "Alpha Robotics", slug: "alpha" };
const BRAVO: StandingsTeam = { id: 2, name: "Bravo Dynamics", slug: "bravo" };
const CHARLIE: StandingsTeam = { id: 3, name: "Charlie Systems", slug: "charlie" };
/** Entered the competition but has not fought yet. */
const DELTA: StandingsTeam = { id: 4, name: "Delta Works", slug: "delta" };

const TEAMS = [ALPHA, BRAVO, CHARLIE, DELTA];

// Robot ids: 11 -> Alpha, 21 -> Bravo, 31 -> Charlie
const FIXTURE: StandingsBout[] = [
  // 1. Alpha beats Bravo on the cards.
  {
    boutId: 1,
    robotAId: 11,
    robotBId: 21,
    teamAId: ALPHA.id,
    teamBId: BRAVO.id,
    result: { winnerRobotId: 11, method: "decision" },
  },
  // 2. Alpha knocks Charlie out — win points plus the finish bonus.
  {
    boutId: 2,
    robotAId: 11,
    robotBId: 31,
    teamAId: ALPHA.id,
    teamBId: CHARLIE.id,
    result: { winnerRobotId: 11, method: "ko" },
  },
  // 3. Bravo and Charlie draw.
  {
    boutId: 3,
    robotAId: 21,
    robotBId: 31,
    teamAId: BRAVO.id,
    teamBId: CHARLIE.id,
    result: { winnerRobotId: null, method: "draw" },
  },
  // 4. Charlie wins by disqualification — a win, but NOT a finish.
  {
    boutId: 4,
    robotAId: 31,
    robotBId: 21,
    teamAId: CHARLIE.id,
    teamBId: BRAVO.id,
    result: { winnerRobotId: 31, method: "dq" },
  },
  // 5. Booked but not yet fought. Must contribute nothing.
  {
    boutId: 5,
    robotAId: 11,
    robotBId: 21,
    teamAId: ALPHA.id,
    teamBId: BRAVO.id,
    result: null,
  },
  // 6. No contest — expunged, not drawn. Must contribute nothing.
  {
    boutId: 6,
    robotAId: 11,
    robotBId: 31,
    teamAId: ALPHA.id,
    teamBId: CHARLIE.id,
    result: { winnerRobotId: null, method: "no_contest" },
  },
];

const run = (bouts = FIXTURE, rules = DEFAULT_POINTS) =>
  computeStandings({ teams: TEAMS, bouts, rules });

const rowFor = (slug: string) => {
  const row = run().find((r) => r.team.slug === slug);
  if (!row) throw new Error(`no standings row for ${slug}`);
  return row;
};

describe("computeStandings", () => {
  it("awards win points plus the finish bonus for a KO", () => {
    // decision win (3) + KO win (3 + 1 bonus) = 7
    const alpha = rowFor("alpha");
    expect(alpha.points).toBe(7);
    expect(alpha.won).toBe(2);
    expect(alpha.lost).toBe(0);
    expect(alpha.ko).toBe(1);
    expect(alpha.played).toBe(2);
  });

  it("does not pay the finish bonus for a disqualification", () => {
    // draw (1) + DQ win (3, no bonus) + KO loss (0) = 4
    const charlie = rowFor("charlie");
    expect(charlie.points).toBe(4);
    expect(charlie.won).toBe(1);
    expect(charlie.lost).toBe(1);
    expect(charlie.drawn).toBe(1);
    // The DQ win must NOT be counted as a knockout.
    expect(charlie.ko).toBe(0);
  });

  it("scores a draw for both teams", () => {
    const bravo = rowFor("bravo");
    // decision loss (0) + draw (1) + DQ loss (0) = 1
    expect(bravo.points).toBe(1);
    expect(bravo.drawn).toBe(1);
    expect(bravo.lost).toBe(2);
    expect(bravo.won).toBe(0);
    expect(bravo.played).toBe(3);
  });

  it("contributes nothing for an unresolved bout", () => {
    const withoutUnresolved = run(FIXTURE.filter((b) => b.boutId !== 5));
    // Removing the unresolved bout must change the table in no way at all.
    expect(withoutUnresolved).toEqual(run());
  });

  it("contributes nothing for a no contest", () => {
    const withoutNoContest = run(FIXTURE.filter((b) => b.boutId !== 6));
    expect(withoutNoContest).toEqual(run());
  });

  it("counts only bouts that were actually resolved as played", () => {
    // Four scoring bouts (1-4), two teams each, so eight appearances total.
    // If the unresolved bout or the no contest leaked in, this would be 10 or 12.
    const totalPlayed = run().reduce((sum, r) => sum + r.played, 0);
    expect(totalPlayed).toBe(8);
  });

  it("includes teams that have not fought yet", () => {
    const delta = rowFor("delta");
    expect(delta.played).toBe(0);
    expect(delta.points).toBe(0);
    // A team with no bouts must appear at the bottom of the table, not vanish
    // from it — a missing row reads as a data error to anyone looking.
    expect(run().map((r) => r.team.slug)).toContain("delta");
  });

  it("ranks by points, then wins, then knockouts, then name", () => {
    expect(run().map((r) => r.team.slug)).toEqual([
      "alpha", // 7
      "charlie", // 4
      "bravo", // 1
      "delta", // 0
    ]);
    expect(run().map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it("breaks a dead-level tie by name so the order is stable", () => {
    // Two teams, no bouts at all — identical on every metric.
    const table = computeStandings({
      teams: [
        { id: 9, name: "Zulu", slug: "zulu" },
        { id: 8, name: "Alfa", slug: "alfa" },
      ],
      bouts: [],
      rules: DEFAULT_POINTS,
    });
    expect(table.map((r) => r.team.slug)).toEqual(["alfa", "zulu"]);
  });

  it("counts a bout once even if it is supplied twice", () => {
    // Guards against a join fan-out silently doubling the table.
    const doubled = run([...FIXTURE, ...FIXTURE]);
    expect(doubled).toEqual(run());
  });

  it("reads the scoring numbers from the competition's rules", () => {
    // A league that pays 5 for a win, 2 for a draw, 1 for showing up, and no
    // finish bonus must produce a different table from the same results.
    const table = run(FIXTURE, {
      winPoints: 5,
      drawPoints: 2,
      lossPoints: 1,
      koBonusPoints: 0,
    });
    const alpha = table.find((r) => r.team.slug === "alpha")!;
    const bravo = table.find((r) => r.team.slug === "bravo")!;
    // Alpha: two wins at 5, no bonus = 10
    expect(alpha.points).toBe(10);
    // Bravo: two losses at 1 + one draw at 2 = 4
    expect(bravo.points).toBe(4);
  });

  it("handles a bout between two robots from the same team", () => {
    // An intra-team exhibition must add exactly one win and one loss to that
    // team rather than double-counting or dropping the result.
    const table = computeStandings({
      teams: [ALPHA],
      bouts: [
        {
          boutId: 100,
          robotAId: 11,
          robotBId: 12,
          teamAId: ALPHA.id,
          teamBId: ALPHA.id,
          result: { winnerRobotId: 11, method: "tko" },
        },
      ],
      rules: DEFAULT_POINTS,
    });
    expect(table[0].played).toBe(2);
    expect(table[0].won).toBe(1);
    expect(table[0].lost).toBe(1);
    expect(table[0].ko).toBe(1);
    // 3 + 1 bonus for the win, 0 for the loss.
    expect(table[0].points).toBe(4);
  });

  it("ignores a bout whose teams are not in the supplied list", () => {
    // Skipping is correct; fabricating a row would hide a data problem.
    const table = computeStandings({
      teams: [ALPHA],
      bouts: [
        {
          boutId: 200,
          robotAId: 11,
          robotBId: 99,
          teamAId: ALPHA.id,
          teamBId: 999,
          result: { winnerRobotId: 99, method: "ko" },
        },
      ],
      rules: DEFAULT_POINTS,
    });
    expect(table).toHaveLength(1);
    expect(table[0].lost).toBe(1);
    expect(table[0].points).toBe(0);
  });
});
