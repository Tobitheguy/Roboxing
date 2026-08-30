import { config } from "dotenv";

// This runs outside Next, so it does not inherit Next's automatic .env
// loading. `dotenv/config` alone reads only `.env` — the Vercel/Neon
// integration writes the connection string to `.env.local`, so that file has
// to be named explicitly or the script sees an empty environment.
config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { ne } from "drizzle-orm";

import {
  adminAudit,
  boutResults,
  bouts,
  competitions,
  events,
  pointsRules,
  robots,
  streams,
  teams,
} from "./schema";

/**
 * Demo seed.
 *
 * EVERY NAME BELOW IS INVENTED. None of it refers to a real league, team, or
 * robot, and none of the results describe a fight that happened. That is
 * deliberate and not a placeholder to be "made realistic later": this site is
 * publicly reachable and there is no signed rights deal, so a public page
 * showing fabricated results attributed to a real organisation is exactly the
 * thing that would sour a rights conversation.
 *
 * The competition is named so that anyone landing on it knows immediately that
 * it is demonstration data.
 */

const DEMO_COMPETITION_SLUG = "exhibition-season-1";

/* -------------------------------------------------------------------------- */

const TEAMS = [
  { slug: "titan-labs", name: "Titan Labs", country: "US", orgName: "Titan Robotics Group", foundedYear: 2024, bio: "Invented demonstration team. Not a real organisation." },
  { slug: "ronin-works", name: "Ronin Works", country: "JP", orgName: "Ronin Heavy Industries", foundedYear: 2023, bio: "Invented demonstration team. Not a real organisation." },
  { slug: "helix-combat", name: "Helix Combat", country: "DE", orgName: "Helix Automata GmbH", foundedYear: 2025, bio: "Invented demonstration team. Not a real organisation." },
  { slug: "vector-foundry", name: "Vector Foundry", country: "US", orgName: "Vector Foundry Inc.", foundedYear: 2024, bio: "Invented demonstration team. Not a real organisation." },
  { slug: "nine-bolt", name: "Nine Bolt Industries", country: "KR", orgName: "Nine Bolt Co.", foundedYear: 2022, bio: "Invented demonstration team. Not a real organisation." },
  { slug: "kestrel-automata", name: "Kestrel Automata", country: "GB", orgName: "Kestrel Automata Ltd", foundedYear: 2025, bio: "Invented demonstration team. Not a real organisation." },
  { slug: "obsidian-mech", name: "Obsidian Mech", country: "CA", orgName: "Obsidian Mechanical", foundedYear: 2023, bio: "Invented demonstration team. Not a real organisation." },
  { slug: "pale-horse", name: "Pale Horse Robotics", country: "AU", orgName: "Pale Horse Pty", foundedYear: 2024, bio: "Invented demonstration team. Not a real organisation." },
];

const ROBOTS = [
  { slug: "titan-07", name: "TITAN-07", team: "titan-labs", model: "T-Series 07", weightClass: "heavyweight", heightCm: 172, weightGrams: 71_000 },
  { slug: "titan-11", name: "TITAN-11", team: "titan-labs", model: "T-Series 11", weightClass: "middleweight", heightCm: 158, weightGrams: 58_500 },
  { slug: "ronin-2", name: "RONIN-2", team: "ronin-works", model: "RW-2", weightClass: "heavyweight", heightCm: 168, weightGrams: 69_000 },
  { slug: "ronin-8", name: "RONIN-8", team: "ronin-works", model: "RW-8", weightClass: "middleweight", heightCm: 155, weightGrams: 56_000 },
  { slug: "helix-c", name: "HELIX-C", team: "helix-combat", model: "HX-C", weightClass: "heavyweight", heightCm: 175, weightGrams: 73_500 },
  { slug: "helix-d", name: "HELIX-D", team: "helix-combat", model: "HX-D", weightClass: "middleweight", heightCm: 160, weightGrams: 59_000 },
  { slug: "vector-9", name: "VECTOR-9", team: "vector-foundry", model: "V9", weightClass: "heavyweight", heightCm: 170, weightGrams: 70_500 },
  { slug: "nb-11", name: "NB-11", team: "nine-bolt", model: "NB-11", weightClass: "heavyweight", heightCm: 166, weightGrams: 68_000 },
  { slug: "kestrel-1", name: "KESTREL-1", team: "kestrel-automata", model: "K1", weightClass: "middleweight", heightCm: 157, weightGrams: 57_500 },
  { slug: "obsidian-4", name: "OBSIDIAN-4", team: "obsidian-mech", model: "OM-4", weightClass: "heavyweight", heightCm: 174, weightGrams: 72_000 },
  { slug: "pale-6", name: "PALE-6", team: "pale-horse", model: "PH-6", weightClass: "middleweight", heightCm: 159, weightGrams: 58_000 },
  { slug: "vector-3", name: "VECTOR-3", team: "vector-foundry", model: "V3", weightClass: "middleweight", heightCm: 154, weightGrams: 55_500 },
];

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste the " +
        "POOLED Neon connection string.",
    );
  }

  const db = drizzle(neon(url));

  // Guard: this script wipes and rewrites the demo competition. If the
  // database contains any OTHER competition, something real is in here and we
  // stop rather than destroying it.
  const foreign = await db
    .select({ slug: competitions.slug })
    .from(competitions)
    .where(ne(competitions.slug, DEMO_COMPETITION_SLUG));

  if (foreign.length > 0) {
    throw new Error(
      `Refusing to seed: this database holds competitions that are not demo ` +
        `data (${foreign.map((c) => c.slug).join(", ")}). Seeding would delete ` +
        `them. Point DATABASE_URL at a scratch database, or remove them first.`,
    );
  }

  console.log("Clearing existing demo data…");
  // Order matters: children before parents.
  await db.delete(boutResults);
  await db.delete(bouts);
  await db.delete(streams);
  await db.delete(events);
  await db.delete(pointsRules);
  await db.delete(competitions);
  await db.delete(robots);
  await db.delete(teams);
  await db.delete(adminAudit);

  console.log("Inserting competition…");
  const [competition] = await db
    .insert(competitions)
    .values({
      slug: DEMO_COMPETITION_SLUG,
      name: "Roboxing Exhibition Season 1",
      organizer: "Roboxing (demonstration data)",
      seasonYear: 2026,
      status: "active",
      description:
        "Demonstration season. Every team, robot, and result below is invented " +
        "to exercise the platform — none of it describes a real event.",
    })
    .returning();

  await db.insert(pointsRules).values({
    competitionId: competition.id,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    koBonusPoints: 1,
  });

  console.log("Inserting teams…");
  const insertedTeams = await db.insert(teams).values(TEAMS).returning();
  const teamBySlug = new Map(insertedTeams.map((t) => [t.slug, t]));

  console.log("Inserting robots…");
  const insertedRobots = await db
    .insert(robots)
    .values(
      ROBOTS.map((r) => ({
        slug: r.slug,
        name: r.name,
        teamId: teamBySlug.get(r.team)!.id,
        model: r.model,
        weightClass: r.weightClass,
        heightCm: r.heightCm,
        weightGrams: r.weightGrams,
        bio: `Invented demonstration robot. Specifications are illustrative.`,
      })),
    )
    .returning();
  const robotBySlug = new Map(insertedRobots.map((r) => [r.slug, r]));
  const R = (slug: string) => robotBySlug.get(slug)!.id;

  console.log("Inserting events…");
  const now = Date.now();
  const [past, upcoming] = await db
    .insert(events)
    .values([
      {
        slug: "exhibition-night-1",
        competitionId: competition.id,
        name: "Exhibition Night 1",
        venue: "Harbor Arena",
        city: "Long Beach",
        country: "US",
        // Deliberately relative to now, so the demo never drifts into a state
        // where "upcoming" is in the past and the countdown renders negative.
        startsAt: new Date(now - 15 * DAY),
        timezone: "America/Los_Angeles",
        status: "completed",
      },
      {
        slug: "exhibition-night-2",
        competitionId: competition.id,
        name: "Exhibition Night 2",
        venue: "Meridian Hall",
        city: "Singapore",
        country: "SG",
        startsAt: new Date(now + 21 * DAY),
        // A non-US venue on purpose: it exercises the dual-timezone rendering
        // ("8:00 AM ET · 8:00 PM Singapore") that a US audience watching an
        // Asian league actually needs.
        timezone: "Asia/Singapore",
        status: "scheduled",
      },
    ])
    .returning();

  console.log("Inserting bouts…");
  // Night 1 — completed. Covers every scoring path the standings can take:
  // a decision, a KO (finish bonus), a draw, and a DQ (win, no bonus).
  const night1 = await db
    .insert(bouts)
    .values([
      { eventId: past.id, competitionId: competition.id, orderIndex: 1, robotAId: R("kestrel-1"), robotBId: R("pale-6"), scheduledRounds: 3, status: "completed" },
      { eventId: past.id, competitionId: competition.id, orderIndex: 2, robotAId: R("ronin-8"), robotBId: R("vector-3"), scheduledRounds: 3, status: "completed" },
      { eventId: past.id, competitionId: competition.id, orderIndex: 3, robotAId: R("nb-11"), robotBId: R("obsidian-4"), scheduledRounds: 3, status: "completed" },
      { eventId: past.id, competitionId: competition.id, orderIndex: 4, robotAId: R("helix-c"), robotBId: R("vector-9"), scheduledRounds: 5, status: "completed" },
      { eventId: past.id, competitionId: competition.id, orderIndex: 5, robotAId: R("titan-07"), robotBId: R("ronin-2"), scheduledRounds: 5, status: "completed" },
    ])
    .returning();

  await db.insert(boutResults).values([
    { boutId: night1[0].id, winnerRobotId: R("kestrel-1"), method: "decision", endRound: 3, endTimeSeconds: 180, recordedAt: new Date(now - 15 * DAY) },
    { boutId: night1[1].id, winnerRobotId: null, method: "draw", endRound: 3, endTimeSeconds: 180, recordedAt: new Date(now - 15 * DAY) },
    { boutId: night1[2].id, winnerRobotId: R("obsidian-4"), method: "dq", endRound: 2, endTimeSeconds: 64, notes: "Illegal contact after the break.", recordedAt: new Date(now - 15 * DAY) },
    { boutId: night1[3].id, winnerRobotId: R("helix-c"), method: "tko", endRound: 4, endTimeSeconds: 132, knockdownsA: 2, knockdownsB: 0, recordedAt: new Date(now - 15 * DAY) },
    { boutId: night1[4].id, winnerRobotId: R("titan-07"), method: "ko", endRound: 2, endTimeSeconds: 74, knockdownsA: 1, knockdownsB: 0, recordedAt: new Date(now - 15 * DAY) },
  ]);

  // Night 2 — scheduled, no results. These bouts must contribute nothing to
  // the standings, which is the case the unit test pins down.
  await db.insert(bouts).values([
    { eventId: upcoming.id, competitionId: competition.id, orderIndex: 1, robotAId: R("vector-3"), robotBId: R("helix-d"), scheduledRounds: 3, status: "scheduled" },
    { eventId: upcoming.id, competitionId: competition.id, orderIndex: 2, robotAId: R("titan-11"), robotBId: R("kestrel-1"), scheduledRounds: 3, status: "scheduled" },
    { eventId: upcoming.id, competitionId: competition.id, orderIndex: 3, robotAId: R("obsidian-4"), robotBId: R("vector-9"), scheduledRounds: 3, status: "scheduled" },
    { eventId: upcoming.id, competitionId: competition.id, orderIndex: 4, robotAId: R("ronin-2"), robotBId: R("nb-11"), scheduledRounds: 5, status: "scheduled" },
    { eventId: upcoming.id, competitionId: competition.id, orderIndex: 5, robotAId: R("titan-07"), robotBId: R("helix-c"), scheduledRounds: 5, status: "scheduled" },
  ]);

  const counts = {
    teams: insertedTeams.length,
    robots: insertedRobots.length,
    events: 2,
    bouts: 10,
    results: 5,
  };
  console.log("Seeded:", counts);
  console.log(
    "\nAll of it is invented. The site shows a DEMO DATA banner while this " +
      "competition is present.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { DEMO_COMPETITION_SLUG };
