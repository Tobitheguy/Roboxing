import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Narrow the site to humanoid fighting and nothing else.
 *
 * The build-out added two neighbouring things: Robowar, where a human sits
 * inside a nine-foot mech, and NHRL, which is wheeled destructive combat. Both
 * were carefully walled off — their own class, their own sections, excluded
 * from every standings table — and both were still on a site whose whole claim
 * is to be the record of HUMANOID robot fighting.
 *
 * A wall is not the same as a promise kept. "Every league" meant something
 * specific, and a visitor who finds a piloted mech league in the index learns
 * that the scope is negotiable. It is not any more.
 *
 * Removed:
 *   - Robowar (piloted mech) and NHRL (wheeled), with their broadcast channels
 *   - The NHRL Pro Tour Finals fixture
 *   - Unitree's GD01, a 500 kg piloted mech that was on the Machines page
 *   - Art Cartwright, who is on this site only as Robowar's founder
 *
 * Kept deliberately: the `competition_class` and `robots.class` columns, and
 * the UFB description's mention of the CES bout staged inside the BattleBox.
 * The columns stay because they are the guard that stops a non-humanoid row
 * ever reaching a standings table again — the cost of an unused enum is
 * nothing, and the cost of re-deriving that rule later is a wrong table. The
 * BattleBox stays because it is a fact about a humanoid bout, not coverage of
 * a wheeled league.
 *
 * Usage: npx tsx scripts/humanoid-only.ts
 */
async function main() {
  const { db } = await import("../src/db");
  const { competitions, events, pilots, robots, watchChannels } = await import(
    "../src/db/schema"
  );
  const { eq, inArray, ne, sql } = await import("drizzle-orm");

  const doomed = await db
    .select({ id: competitions.id, slug: competitions.slug })
    .from(competitions)
    .where(ne(competitions.class, "humanoid"));

  if (doomed.length === 0) {
    console.log("Nothing to remove — every competition is already humanoid.");
  }
  const ids = doomed.map((c) => c.id);

  if (ids.length > 0) {
    // Events hold a RESTRICT reference to competitions, so they go first or
    // the delete below fails with a foreign-key error rather than a useful one.
    const killedEvents = await db
      .delete(events)
      .where(inArray(events.competitionId, ids))
      .returning({ slug: events.slug });
    console.log(
      `Events removed: ${killedEvents.map((e) => e.slug).join(", ") || "none"}`,
    );

    // Cascades would take these with the competition; deleting them explicitly
    // means the count below is a fact rather than an assumption.
    const killedChannels = await db
      .delete(watchChannels)
      .where(inArray(watchChannels.competitionId, ids))
      .returning({ id: watchChannels.id });
    console.log(`Watch channels removed: ${killedChannels.length}`);

    /*
     * Pilots point at competitions with ON DELETE SET NULL, so these people
     * would SURVIVE the delete as unaffiliated names — which is worse than
     * either keeping or removing them. Anyone whose only reason to be on this
     * site is a league that is leaving, leaves with it.
     */
    const killedPilots = await db
      .delete(pilots)
      .where(inArray(pilots.competitionId, ids))
      .returning({ slug: pilots.slug });
    console.log(
      `Pilots removed: ${killedPilots.map((p) => p.slug).join(", ") || "none"}`,
    );

    const killedComps = await db
      .delete(competitions)
      .where(inArray(competitions.id, ids))
      .returning({ slug: competitions.slug });
    console.log(`Leagues removed: ${killedComps.map((c) => c.slug).join(", ")}`);
  }

  const killedRobots = await db
    .delete(robots)
    .where(ne(robots.class, "humanoid"))
    .returning({ slug: robots.slug });
  console.log(
    `Machines removed: ${killedRobots.map((r) => r.slug).join(", ") || "none"}`,
  );

  /*
   * Wang Xingxing stays — he runs the company that builds most of the machines
   * this sport is fought on — but his headline achievement here was driving a
   * piloted mech through a brick wall, which is now off-topic. Replace it with
   * what he matters for.
   */
  await db
    .update(pilots)
    .set({
      notableResult:
        "Founded Unitree, whose G1 is the platform most humanoid fighting is staged on.",
      bio: "Founded Unitree in 2016. Its G1 was the machine in all four corners of the first Iron Fist King tournament, and Unitree became UFB's official robotics partner in November 2025. He met Dana White at the UFC's Shanghai humanoid exhibition in August 2025. In September 2026 Unitree claimed the first fully autonomous humanoid combat, a claim nobody outside the company has verified.",
    })
    .where(eq(pilots.slug, "wang-xingxing"));

  // Read it back rather than trust the writes above.
  const [remaining] = await db
    .select({
      leagues: sql<number>`(select count(*) from ${competitions} where ${competitions.class} <> 'humanoid')::int`,
      machines: sql<number>`(select count(*) from ${robots} where ${robots.class} <> 'humanoid')::int`,
      gd01: sql<number>`(select count(*) from ${pilots} where ${pilots.bio} ilike '%GD01%' or ${pilots.notableResult} ilike '%GD01%')::int`,
    })
    .from(competitions)
    .limit(1);

  console.log("\nNon-humanoid rows still present:", remaining);
  if (remaining.leagues || remaining.machines || remaining.gd01) {
    throw new Error("Something non-humanoid survived — see above.");
  }
  console.log("Humanoid only. Verified.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
