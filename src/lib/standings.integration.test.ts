import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  boutResults,
  bouts,
  competitions,
  events,
  pointsRules,
  robots,
  teams,
} from "@/db/schema";
import { getStandingsBySlug, type StandingRow } from "./standings";

/**
 * Integration cover for getStandings().
 *
 * The unit tests prove the arithmetic, but they hand computeStandings() a
 * hand-built fixture — they never exercise the joins that produce it. That is
 * exactly where the expensive bugs live: which team a result is attributed to,
 * whether an unresolved bout survives the LEFT JOIN as a null, whether the
 * points rule is actually read. This test runs the real query against the real
 * database.
 *
 * It used to assert against the seeded demo season. That season was deleted on
 * 2026-09-07 when the real leagues went in, and the suite went red — a test
 * coupled to fixture data somebody else owns is a test that breaks for reasons
 * unrelated to the code it covers. So it now builds and tears down its own
 * competition, and depends on nothing that ships.
 *
 * Skipped automatically when there is no DATABASE_URL, so `npm test` still
 * works on a machine that has never connected to Neon.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

// Say so, loudly. A suite that skips itself prints the same green summary as
// one that passed, and the difference only shows up in a number nobody reads.
if (!hasDb) {
  console.warn(
    "\n[standings.integration] SKIPPED — no DATABASE_URL.\n" +
      "The joins that attribute a result to a team are NOT covered by this run.\n",
  );
}

/**
 * Namespaced so a crashed run leaves droppings that are obviously test data
 * and can be deleted with one LIKE, rather than colliding with a real slug.
 */
const NS = "itest-standings";

describe.skipIf(!hasDb)("getStandings (live database)", () => {
  let table: StandingRow[];

  beforeAll(async () => {
    // Clean up anything a previous crashed run left behind, in FK order.
    await teardown();

    const [competition] = await db
      .insert(competitions)
      .values({ slug: NS, name: "Integration Test League", status: "active" })
      .returning({ id: competitions.id });

    // 3 win / 1 draw / 0 loss / 1 KO bonus — the defaults, stated explicitly so
    // the expected totals below do not silently change if the schema default
    // ever does.
    await db.insert(pointsRules).values({
      competitionId: competition.id,
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      koBonusPoints: 1,
    });

    const teamRows = await db
      .insert(teams)
      .values(
        ["alpha", "bravo", "charlie", "delta"].map((n) => ({
          slug: `${NS}-${n}`,
          name: `Test ${n}`,
        })),
      )
      .returning({ id: teams.id, slug: teams.slug });
    const team = Object.fromEntries(
      teamRows.map((t) => [t.slug.replace(`${NS}-`, ""), t.id]),
    );

    const robotRows = await db
      .insert(robots)
      .values(
        (["alpha", "bravo", "charlie", "delta"] as const).map((n) => ({
          slug: `${NS}-${n}-bot`,
          name: `Bot ${n}`,
          teamId: team[n],
        })),
      )
      .returning({ id: robots.id, slug: robots.slug });
    const bot = Object.fromEntries(
      robotRows.map((r) => [r.slug.replace(`${NS}-`, "").replace("-bot", ""), r.id]),
    );

    const [event] = await db
      .insert(events)
      .values({
        slug: `${NS}-event`,
        competitionId: competition.id,
        name: "Integration Test Night",
        startsAt: new Date("2026-01-01T00:00:00Z"),
      })
      .returning({ id: events.id });

    const boutRows = await db
      .insert(bouts)
      .values([
        // 0: alpha beats bravo by KO   → alpha 3+1
        { a: "alpha", b: "bravo" },
        // 1: charlie beats delta by DQ → charlie 3, NO bonus
        { a: "charlie", b: "delta" },
        // 2: alpha and charlie draw    → 1 each
        { a: "alpha", b: "charlie" },
        // 3: scheduled, no result      → must not count as played
        { a: "bravo", b: "delta" },
      ].map((m, i) => ({
        eventId: event.id,
        competitionId: competition.id,
        orderIndex: i,
        robotAId: bot[m.a],
        robotBId: bot[m.b],
        teamAId: team[m.a],
        teamBId: team[m.b],
      })))
      .returning({ id: bouts.id, orderIndex: bouts.orderIndex });
    const boutId = Object.fromEntries(boutRows.map((b) => [b.orderIndex, b.id]));

    await db.insert(boutResults).values([
      { boutId: boutId[0], winnerRobotId: bot.alpha, method: "ko" },
      { boutId: boutId[1], winnerRobotId: bot.charlie, method: "dq" },
      { boutId: boutId[2], winnerRobotId: null, method: "draw" },
    ]);

    table = await getStandingsBySlug(NS);
  });

  afterAll(teardown);

  async function teardown() {
    const comp = await db
      .select({ id: competitions.id })
      .from(competitions)
      .where(eq(competitions.slug, NS));
    if (comp.length) {
      const ids = comp.map((c) => c.id);
      const b = await db
        .select({ id: bouts.id })
        .from(bouts)
        .where(inArray(bouts.competitionId, ids));
      if (b.length) {
        await db
          .delete(boutResults)
          .where(inArray(boutResults.boutId, b.map((x) => x.id)));
        await db.delete(bouts).where(inArray(bouts.competitionId, ids));
      }
      await db.delete(events).where(inArray(events.competitionId, ids));
      await db.delete(pointsRules).where(inArray(pointsRules.competitionId, ids));
      await db.delete(competitions).where(inArray(competitions.id, ids));
    }
    // Robots before teams — the FK is RESTRICT, not cascade.
    const r = await db.select({ id: robots.id, slug: robots.slug }).from(robots);
    const mine = r.filter((x) => x.slug.startsWith(NS)).map((x) => x.id);
    if (mine.length) await db.delete(robots).where(inArray(robots.id, mine));
    const t = await db.select({ id: teams.id, slug: teams.slug }).from(teams);
    const myTeams = t.filter((x) => x.slug.startsWith(NS)).map((x) => x.id);
    if (myTeams.length) await db.delete(teams).where(inArray(teams.id, myTeams));
  }

  it("returns every team that appears in the competition", () => {
    expect(table).toHaveLength(4);
  });

  it("counts only resolved bouts as played", () => {
    // 3 resolved bouts × 2 teams = 6 appearances. If the scheduled fourth bout
    // leaked through the LEFT JOIN as anything other than null, this is 8.
    expect(table.reduce((sum, r) => sum + r.played, 0)).toBe(6);
  });

  it("pays the finish bonus for a KO but not for a DQ", () => {
    const by = new Map(table.map((r) => [r.team.slug, r]));

    // alpha: KO win (3+1) plus a draw (1) = 5.
    expect(by.get(`${NS}-alpha`)!.points).toBe(5);
    expect(by.get(`${NS}-alpha`)!.ko).toBe(1);

    // charlie won by disqualification. A win, but not a finish — 3 points and
    // a KO count of zero, plus the draw. This is the regression that matters
    // most: a DQ paying the finish bonus would inflate the table silently.
    expect(by.get(`${NS}-charlie`)!.points).toBe(4);
    expect(by.get(`${NS}-charlie`)!.won).toBe(1);
    expect(by.get(`${NS}-charlie`)!.ko).toBe(0);
  });

  it("scores the draw for both teams involved", () => {
    const by = new Map(table.map((r) => [r.team.slug, r]));
    expect(by.get(`${NS}-alpha`)!.drawn).toBe(1);
    expect(by.get(`${NS}-charlie`)!.drawn).toBe(1);
  });

  it("awards points that sum to the expected season total", () => {
    // alpha 5 + charlie 4 + bravo 0 + delta 0
    expect(table.reduce((sum, r) => sum + r.points, 0)).toBe(9);
  });

  it("orders the table by points and assigns positions from 1", () => {
    const points = table.map((r) => r.points);
    expect([...points]).toEqual([...points].sort((a, b) => b - a));
    expect(table.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it("credits every win and loss to exactly one team", () => {
    expect(table.reduce((s, r) => s + r.won, 0)).toBe(2);
    expect(table.reduce((s, r) => s + r.lost, 0)).toBe(2);
    expect(table.reduce((s, r) => s + r.drawn, 0)).toBe(2);
  });
});
