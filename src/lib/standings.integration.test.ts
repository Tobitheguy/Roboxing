import { beforeAll, describe, expect, it } from "vitest";

import { DEMO_COMPETITION_SLUG } from "@/db/constants";
import { getStandingsBySlug, type StandingRow } from "./standings";

/**
 * Integration cover for getStandings().
 *
 * The unit tests prove the arithmetic, but they hand computeStandings() a
 * hand-built fixture — they never exercise the joins that produce it. That is
 * exactly where the expensive bugs live: which team a result is attributed to,
 * whether an unresolved bout survives the LEFT JOIN as a null, whether the
 * points rule is actually read. This test runs the real query against the real
 * database and checks the seeded season comes back as expected.
 *
 * Skipped automatically when there is no DATABASE_URL, so `npm test` still
 * works on a machine that has never connected to Neon.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

// Say so, loudly. A suite that skips itself prints the same green summary as
// one that passed, and the difference only shows up in a number nobody reads.
// This ran once against a machine that DID have a DATABASE_URL and skipped
// anyway; without a line in the output there was nothing to notice.
if (!hasDb) {
  console.warn(
    "\n[standings.integration] SKIPPED — no DATABASE_URL.\n" +
      "The joins that attribute a result to a team are NOT covered by this run.\n",
  );
}

describe.skipIf(!hasDb)("getStandings (live database)", () => {
  let table: StandingRow[];

  beforeAll(async () => {
    table = await getStandingsBySlug(DEMO_COMPETITION_SLUG);
  });

  it("returns every team that appears in the competition", () => {
    expect(table).toHaveLength(8);
  });

  it("counts only resolved bouts as played", () => {
    // Night 1 has 5 resolved bouts; Night 2 has 5 scheduled with no results.
    // Two teams per resolved bout = 10 appearances. If the scheduled bouts
    // leaked through the LEFT JOIN as anything other than null, this is 20.
    const totalPlayed = table.reduce((sum, r) => sum + r.played, 0);
    expect(totalPlayed).toBe(10);
  });

  it("pays the finish bonus for a KO but not for a DQ", () => {
    const byName = new Map(table.map((r) => [r.team.slug, r]));

    // Titan Labs won by KO, Helix Combat by TKO: 3 + 1 bonus each.
    expect(byName.get("titan-labs")!.points).toBe(4);
    expect(byName.get("titan-labs")!.ko).toBe(1);
    expect(byName.get("helix-combat")!.points).toBe(4);
    expect(byName.get("helix-combat")!.ko).toBe(1);

    // Kestrel won on the cards: 3, no bonus.
    expect(byName.get("kestrel-automata")!.points).toBe(3);
    expect(byName.get("kestrel-automata")!.ko).toBe(0);

    // Obsidian won by disqualification. A win, but not a finish — so 3 points
    // and a KO count of zero. This is the regression that matters most: a DQ
    // paying the finish bonus would inflate the table and nobody would notice.
    expect(byName.get("obsidian-mech")!.points).toBe(3);
    expect(byName.get("obsidian-mech")!.won).toBe(1);
    expect(byName.get("obsidian-mech")!.ko).toBe(0);
  });

  it("scores the draw for both teams involved", () => {
    const byName = new Map(table.map((r) => [r.team.slug, r]));
    // Ronin and Vector drew one and lost one apiece.
    expect(byName.get("ronin-works")!.drawn).toBe(1);
    expect(byName.get("vector-foundry")!.drawn).toBe(1);
    expect(byName.get("ronin-works")!.points).toBe(1);
    expect(byName.get("vector-foundry")!.points).toBe(1);
  });

  it("awards points that sum to the expected season total", () => {
    // 4 + 4 + 3 + 3 + 1 + 1 + 0 + 0
    expect(table.reduce((sum, r) => sum + r.points, 0)).toBe(16);
  });

  it("orders the table by points and assigns positions from 1", () => {
    const points = table.map((r) => r.points);
    expect([...points]).toEqual([...points].sort((a, b) => b - a));
    expect(table.map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("credits every win and loss to exactly one team", () => {
    const wins = table.reduce((s, r) => s + r.won, 0);
    const losses = table.reduce((s, r) => s + r.lost, 0);
    const draws = table.reduce((s, r) => s + r.drawn, 0);
    // 4 decisive bouts, 1 draw.
    expect(wins).toBe(4);
    expect(losses).toBe(4);
    expect(draws).toBe(2);
  });
});
