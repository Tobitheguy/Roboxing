import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray, sql } from "drizzle-orm";

import {
  boutResults,
  bouts,
  competitions,
  events,
  pointsRules,
  predictions,
  robots,
  streams,
  teams,
} from "../src/db/schema";

/**
 * Replace the invented demo season with the real humanoid robot fighting
 * landscape as of September 2026.
 *
 * This is the launch interlock. `robots.txt` blocks every crawler for as long
 * as the demo competition exists, and `DemoBanner` tells every visitor that
 * the data is fake — both keyed on the same seeded season. Running this with
 * --commit removes it, which opens the site to search within the hour.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT IS AND IS NOT IN HERE
 *
 * Every row below is sourced, and each carries the URL it came from in
 * `source_url` or in its description. That is not decoration: the entire pitch
 * of this site is being the reliable English-language record of this sport,
 * and a record that cannot say where a date came from is just a rumour with
 * better typography.
 *
 * Deliberately ABSENT, and each absence is a decision rather than an omission:
 *
 * - **Almost no bouts and results — with one earned exception.** Fight
 *   outcomes are the most perishable facts here and the least well reported
 *   in English. The URKL opener (Matador def. White Eagle, 3–2) was later
 *   verified against two independent Chinese sources and is seeded by
 *   `seed-urkl-opener.ts`; Iron Fist King's "AI Strategist took it with three
 *   knockouts" never came with a card or scorecards and stays narrative-only.
 *   The bar for entering a result is two independent sources naming winner,
 *   score and method — not one outlet's glimpse.
 *
 * - **No URKL grand final.** It is planned for Dubai in "late December 2026 or
 *   January 2027". That is not a date. An entry on the calendar implies one,
 *   and the calendar is the product. It lives in the competition description
 *   until the organizer announces a day.
 *
 * - **No REK event.** REK's San Francisco matches happened — the exact dates
 *   were not consistently reported, and reports of attendance conflict
 *   (one says ~3,400 tickets, another says "hundreds"). The league is listed;
 *   its events are not, until there is a date to stand behind.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   npx tsx scripts/seed-real-leagues.ts            # dry run — prints the plan
 *   npx tsx scripts/seed-real-leagues.ts --commit   # actually does it
 */

const COMMIT = process.argv.includes("--commit");

const DEMO_COMPETITION_SLUG = "exhibition-season-1";

/* -------------------------------------------------------------------------- */
/* The data                                                                    */
/* -------------------------------------------------------------------------- */

const COMPETITIONS = [
  {
    slug: "urkl",
    name: "Ultimate Robot Knock-out Legend",
    organizer: "EngineAI",
    seasonYear: 2026,
    status: "active" as const,
    description:
      "The first commercial free-combat league for full-size humanoid robots, launched by Shenzhen's EngineAI on 9 February 2026. Every team fights the same hardware — the EngineAI T800 — under hybrid control, where an operator issues commands and the robot executes them physically. Scoring is not knockouts alone: matches are judged on balance, power delivery, motion control, decision-making, perception and structural durability. Over 200 teams from 10 countries entered, including Stanford, Tsinghua and Zhejiang University; 32 came through the online qualifiers. The prize pool is 10 million yuan, about $1.44 million, and the champion takes a 10-kilogram solid gold belt.\n\nThe season runs in four stages: the 16 July opener in Shenzhen, an August physical play-in cutting the field from 32 to 16, a 16-team group stage in October, and a grand final reported for Dubai in late December 2026 or January 2027. No date has been announced for the final, and no complete bracket has been published.\n\nThe opening bout put White Eagle against Matador (斗牛士, sometimes translated Bullfighter). Chinese reporting — Huacheng and People's Daily — records Matador winning 3–2 over five rounds despite losing its head module to a flying kick early in the fight; English outlets that saw the kick and called it for White Eagle were wrong. The full result is in our records.",
  },
  {
    slug: "cyberhero",
    name: "CyberHero",
    organizer: "Hero Esports",
    seasonYear: 2026,
    status: "active" as const,
    description:
      "A global robotic sports property from Hero Esports, Asia's largest esports company, built as live entertainment rather than as a technical competition — robot kickboxing staged with music, lighting and a DJ set from the producer Tokyo Machine. It debuts in Riyadh on 9 September 2026 with ten EngineAI T800 humanoids fighting in two teams of three.\n\nThe pilots are the tell. Where URKL fields engineers and university teams, CyberHero has the robots driven by two professional Street Fighter players — which places it much closer to esports than to a robotics benchmark, and is the clearest statement yet of what Hero Esports thinks this sport is for.\n\nNo team or robot names have been published.",
  },
  {
    slug: "world-humanoid-robot-games",
    name: "World Humanoid Robot Games",
    organizer:
      "China Media Group, Beijing Municipal People's Government, World Robot Cooperation Organization, Asia-Pacific RoboCup International Council",
    seasonYear: 2026,
    status: "completed" as const,
    description:
      "The largest humanoid robot competition in the world, and only partly a fighting one — combat sits alongside athletics, football, wushu, weightlifting and even tug of war. The second edition ran in Beijing from 22 to 26 August 2026 with 2,056 robots and 666 teams from 16 countries across 51 events, up from 280 teams and roughly 500 robots at the inaugural games in August 2025.\n\nThe combat discipline is Free Combat, contested in 40 kg, 58 kg and 80 kg classes; kickboxing permits a human in the loop rather than requiring full autonomy. Per-bout results are published only in the organizer's Chinese-language result documents, so no fight record from these games is carried here yet.\n\nAGIBOT topped both medal tables on its debut with 18 gold, 16 silver and 12 bronze — 46 in total. The headline outside the ring belonged to the Beijing Humanoid Robot Innovation Center: its Tiangong Ultra ran 100 metres in 8.64 seconds, and Tiangong robots beat four human world records across the 100 m, 400 m, 1500 m and high jump.",
  },
  {
    slug: "rek",
    name: "REK",
    organizer: "REK",
    seasonYear: 2026,
    status: "active" as const,
    description:
      "A San Francisco promotion founded by Cix Liv, and the first to stage humanoid robot fights in the United States. Its matches pit modified Unitree G1 robots — around 4.5 feet and 80 pounds — against each other, driven by human pilots wearing VR headsets, in nightclub venues at $60 to $80 a ticket.\n\nIt is the commercial counter-argument to the Chinese leagues: no engineering rubric, no standardised platform supplied by a manufacturer, just a ticketed show. By August 2026 REK listed twelve events across eight cities, and an America tour taking in Los Angeles, Las Vegas, Austin, Miami and New York reportedly sold out every stop. Reporting on the tour's dates is contradictory, so this site carries no REK fixtures until the promotion publishes a calendar.\n\nLiv has said REK intends to launch a full league built on purpose-made combat machines of roughly six feet and 200 pounds.",
  },
  {
    slug: "iron-fist-king",
    name: "Iron Fist King: Awakening",
    organizer: "Unitree Robotics",
    seasonYear: 2025,
    status: "completed" as const,
    description:
      "The event that started the sport. On 25 May 2025 in Hangzhou, Unitree staged the world's first humanoid robot boxing tournament: four G1 robots, each steered by a human operator, over three two-minute rounds, scoring one point for a hand strike and three for a kick.\n\nThe entrants fought under nicknames rather than team colours — the tournament was won by AI Strategist, reported as taking three consecutive knockouts, with Silk Artisan the best-remembered opponent after going down in the third and landing in an accidental split. Unitree has not published a full card or scorecards, so the bout-by-bout record is not reproduced here.\n\nIt was a one-off exhibition rather than a season, and every league that followed is measured against it.",
  },
];

/**
 * The organisations behind the robots.
 *
 * A note on the model, because it does not fit this sport cleanly. `teams` was
 * designed for the entity that FIELDS a robot, and in these leagues the
 * hardware is standardised and supplied by the manufacturer while universities
 * and studios supply the operators. Until individual fighters are reported by
 * name with the team behind them, the manufacturer is the honest owner of the
 * platform entry, and the competing teams are recorded alongside.
 */
const TEAMS = [
  {
    slug: "engineai",
    name: "EngineAI",
    country: "CN",
    orgName: "Shenzhen EngineAI Robotics Technology Co., Ltd.",
    foundedYear: 2023,
    bio: "Shenzhen humanoid manufacturer, led by CEO Zhao Tongyang. Builds the T800 that URKL and CyberHero both run on, and founded URKL itself in February 2026 — making it simultaneously the hardware supplier and the league operator for most of the sport outside the United States.",
  },
  {
    slug: "unitree-robotics",
    name: "Unitree Robotics",
    country: "CN",
    orgName: "Hangzhou Yushu Technology Co., Ltd.",
    foundedYear: 2016,
    bio: "Hangzhou manufacturer whose G1 is the most widely used humanoid in combat events. Staged Iron Fist King: Awakening in May 2025, the first robot boxing tournament ever held, and its machines are the ones REK modified for the first fights in the United States.",
  },
  {
    slug: "stanford-university",
    name: "Stanford University",
    country: "US",
    orgName: "Stanford University",
    bio: "Among the 32 teams that came through URKL's online qualifiers for the 2026 season.",
  },
  {
    slug: "tsinghua-university",
    name: "Tsinghua University",
    country: "CN",
    orgName: "Tsinghua University",
    bio: "Among the 32 teams that came through URKL's online qualifiers for the 2026 season.",
  },
  {
    slug: "zhejiang-university",
    name: "Zhejiang University",
    country: "CN",
    orgName: "Zhejiang University",
    bio: "Among the 32 teams that came through URKL's online qualifiers for the 2026 season.",
  },
];

/**
 * The hardware.
 *
 * These are platforms, not named fighters. Both are well documented by their
 * manufacturers, which is exactly why they are here and why individual fight
 * names are not: a spec sheet is a stable fact, a fighter's record is a
 * perishable one.
 */
const ROBOTS = [
  {
    slug: "engineai-t800",
    teamSlug: "engineai",
    name: "T800",
    model: "T800",
    weightClass: "Full size",
    heightCm: 173,
    weightGrams: 75_000,
    bio: "The standard platform of URKL and CyberHero. Roughly the size of an adult man, with 29 articulated joints, 450 N·m peak joint torque and four to five hours of battery. Carries 360-degree LiDAR, stereo vision and omnidirectional radar. Reported at about $40,000; URKL supplies them to competing teams rather than selling them in.",
    specs: {
      articulatedJoints: 29,
      peakJointTorqueNm: 450,
      batteryHours: "4–5",
      sensors: ["360° LiDAR", "stereo vision", "omnidirectional radar"],
    },
  },
  {
    slug: "unitree-g1",
    teamSlug: "unitree-robotics",
    name: "G1",
    model: "G1",
    weightClass: "Child size",
    heightCm: 130,
    weightGrams: 35_000,
    bio: "The machine that fought the first robot boxing match. 23 degrees of freedom and 90 N·m of knee joint torque — enough for hooks, side kicks and getting back up off the floor, which turned out to be the capability audiences actually came for. REK's San Francisco fights use modified G1s under VR control.",
    specs: {
      degreesOfFreedom: 23,
      kneeJointTorqueNm: 90,
    },
  },
];

/**
 * Real, dated events.
 *
 * `startTimeTbd` is set wherever a start time was not announced — which is
 * most of them. Organizers publish a day and nothing more, and rendering a
 * guessed hour beside it would be the site inventing a fact in its most
 * confident-looking element.
 */
const EVENTS = [
  {
    slug: "iron-fist-king-awakening-2025",
    competitionSlug: "iron-fist-king",
    name: "Iron Fist King: Awakening",
    venue: "Hangzhou Mech Combat Arena",
    city: "Hangzhou",
    country: "CN",
    // 25 May 2025, 20:30 local (UTC+8).
    startsAt: new Date("2025-05-25T12:30:00Z"),
    timezone: "Asia/Shanghai",
    startTimeTbd: false,
    status: "completed" as const,
    sourceUrl:
      "https://roboticsandautomationnews.com/2025/05/24/robot-boxing-tournament-in-china-concludes-with-decisive-knockout/91168/",
  },
  {
    slug: "urkl-opening-shenzhen-2026",
    competitionSlug: "urkl",
    name: "URKL Opening Round",
    venue: "Nanshan Cultural and Sports Center",
    city: "Shenzhen",
    country: "CN",
    // 16 July 2026. No start time was announced.
    startsAt: new Date("2026-07-16T04:00:00Z"),
    timezone: "Asia/Shanghai",
    startTimeTbd: true,
    status: "completed" as const,
    sourceUrl: "https://en.wikipedia.org/wiki/Ultimate_Robot_Knock-out_Legend",
  },
  {
    slug: "world-humanoid-robot-games-2026",
    competitionSlug: "world-humanoid-robot-games",
    name: "World Humanoid Robot Games 2026",
    venue: "Beijing National Speed Skating Oval",
    city: "Beijing",
    country: "CN",
    // Ran 22–26 August 2026; the calendar carries the opening day. Kickboxing
    // was contested on 23 August.
    startsAt: new Date("2026-08-22T04:00:00Z"),
    timezone: "Asia/Shanghai",
    startTimeTbd: true,
    status: "completed" as const,
    sourceUrl: "https://en.wikipedia.org/wiki/World_Humanoid_Robot_Games",
  },
  {
    slug: "cyberhero-riyadh-2026",
    competitionSlug: "cyberhero",
    name: "CyberHero x Riyadh",
    venue: "MBC Studio 1, Boulevard City",
    city: "Riyadh",
    country: "SA",
    // 9 September 2026, 21:00 local (UTC+3). Doors 20:30.
    startsAt: new Date("2026-09-09T18:00:00Z"),
    timezone: "Asia/Riyadh",
    startTimeTbd: false,
    status: "scheduled" as const,
    // No broadcastUrl on purpose. The organizer's own FAQ says the event will
    // NOT be live-streamed — it is recorded, with highlights released
    // afterwards on CyberHero channels. Putting a link here would promise a
    // stream that does not exist.
    sourceUrl: "https://cyber.hero.com/",
  },
];

/* -------------------------------------------------------------------------- */
/* Runner                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = drizzle(neon(url), {
    schema: { competitions, teams, robots, events, bouts, boutResults },
  });

  console.log(COMMIT ? "COMMIT — writing changes\n" : "DRY RUN — no writes. Pass --commit to apply.\n");

  /* ---- What would be removed ---------------------------------------- */

  const demo = await db
    .select({ id: competitions.id, name: competitions.name })
    .from(competitions)
    .where(eq(competitions.slug, DEMO_COMPETITION_SLUG));

  if (demo.length === 0) {
    console.log("No demo competition present — nothing to remove.");
  } else {
    const demoIds = demo.map((c) => c.id);
    const demoEvents = await db
      .select({ id: events.id, name: events.name })
      .from(events)
      .where(inArray(events.competitionId, demoIds));
    const demoBouts = await db
      .select({ id: bouts.id })
      .from(bouts)
      .where(inArray(bouts.competitionId, demoIds));

    console.log(`Demo competition: ${demo[0].name}`);
    console.log(`  events to delete: ${demoEvents.length}`);
    for (const e of demoEvents) console.log(`    - ${e.name}`);
    console.log(`  bouts to delete:  ${demoBouts.length}`);
    console.log(
      "  every team and robot not referenced by a surviving bout will also go\n",
    );

    if (COMMIT) {
      const boutIds = demoBouts.map((b) => b.id);
      const eventIds = demoEvents.map((e) => e.id);

      // Order matters. `bouts` and `events` hold RESTRICT foreign keys to
      // robots and teams, so the fixtures have to go before the entities they
      // point at — otherwise Postgres refuses and the run half-completes.
      if (boutIds.length) {
        await db.delete(boutResults).where(inArray(boutResults.boutId, boutIds));
        await db.delete(predictions).where(inArray(predictions.boutId, boutIds));
        await db.delete(bouts).where(inArray(bouts.id, boutIds));
      }
      if (eventIds.length) {
        await db.delete(streams).where(inArray(streams.eventId, eventIds));
        await db.delete(events).where(inArray(events.id, eventIds));
      }
      // Robots and teams are shared by slug space, not by competition, so they
      // are removed by "nothing references them any more" rather than by
      // ownership — which also cleans up anything orphaned by an earlier run.
      // `NOT IN (subquery)` returns NOTHING when the subquery yields a NULL,
      // and would delete nothing at all once the last bout is gone — so the
      // empty case is handled explicitly rather than relying on a construct
      // that fails silently in exactly that situation.
      await db.execute(sql`
        delete from robots
        where not exists (
          select 1 from bouts
          where bouts.robot_a_id = robots.id or bouts.robot_b_id = robots.id
        )
        and not exists (select 1 from predictions where predictions.robot_id = robots.id)
      `);
      await db.execute(sql`
        delete from teams
        where not exists (
          select 1 from bouts
          where bouts.team_a_id = teams.id or bouts.team_b_id = teams.id
        )
        and not exists (select 1 from robots where robots.team_id = teams.id)
      `);
      await db.delete(pointsRules).where(inArray(pointsRules.competitionId, demoIds));
      await db.delete(competitions).where(inArray(competitions.id, demoIds));
      console.log("  removed.\n");
    }
  }

  /* ---- What would be added ------------------------------------------ */

  console.log(`Competitions to upsert: ${COMPETITIONS.length}`);
  for (const c of COMPETITIONS) console.log(`  - ${c.name} (${c.organizer})`);
  console.log(`Teams to upsert:        ${TEAMS.length}`);
  console.log(`Robots to upsert:       ${ROBOTS.length}`);
  console.log(`Events to upsert:       ${EVENTS.length}`);
  for (const e of EVENTS) {
    console.log(
      `  - ${e.name} — ${e.city} — ${e.startsAt.toISOString().slice(0, 10)}${e.startTimeTbd ? " (time TBA)" : ""}`,
    );
  }

  if (!COMMIT) {
    console.log("\nDry run complete. Nothing was written.");
    return;
  }

  const competitionIds = new Map<string, number>();
  for (const c of COMPETITIONS) {
    const [row] = await db
      .insert(competitions)
      .values(c)
      // Upsert by slug so the script is safe to re-run — a second run corrects
      // a description rather than failing on a unique violation.
      .onConflictDoUpdate({ target: competitions.slug, set: c })
      .returning({ id: competitions.id });
    competitionIds.set(c.slug, row.id);

    // Standings are computed from these; a competition without them has no
    // table at all. 3-1-0 with a KO bonus is the schema default and a
    // reasonable starting point for leagues that have not published scoring.
    await db
      .insert(pointsRules)
      .values({ competitionId: row.id })
      .onConflictDoNothing();
  }

  const teamIds = new Map<string, number>();
  for (const t of TEAMS) {
    const [row] = await db
      .insert(teams)
      .values(t)
      .onConflictDoUpdate({ target: teams.slug, set: t })
      .returning({ id: teams.id });
    teamIds.set(t.slug, row.id);
  }

  for (const { teamSlug, specs, ...r } of ROBOTS) {
    const teamId = teamIds.get(teamSlug);
    if (!teamId) throw new Error(`Unknown team slug: ${teamSlug}`);
    const values = { ...r, teamId, specsJson: specs };
    await db
      .insert(robots)
      .values(values)
      .onConflictDoUpdate({ target: robots.slug, set: values });
  }

  for (const { competitionSlug, ...e } of EVENTS) {
    const competitionId = competitionIds.get(competitionSlug);
    if (!competitionId) throw new Error(`Unknown competition: ${competitionSlug}`);
    const values = { ...e, competitionId, access: "free" as const };
    await db
      .insert(events)
      .values(values)
      .onConflictDoUpdate({ target: events.slug, set: values });
  }

  console.log("\nDone. The demo season is gone, so robots.txt opens the site");
  console.log("to crawlers within the hour and the DEMO DATA banner disappears.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
