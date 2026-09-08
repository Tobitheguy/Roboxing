import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";

/**
 * The first verified result on the site — and the proof of the entire thesis.
 *
 * English media could not agree who won URKL's opening bout: outlets that saw
 * White Eagle's flying kick take Matador's head off called it for White
 * Eagle. The Chinese record says otherwise, twice over: Guangzhou's Huacheng
 * (gz-cmc.com) and People's Daily both report 斗牛士 (Matador) WINNING 3:2
 * over five rounds — fighting on after losing its head module, on the T800's
 * distributed torso control, and being carried off stage in victory while
 * White Eagle stood to take the applause. That story existed only in Chinese
 * until this row was written, which is exactly the gap this site exists to
 * close.
 *
 * Modelling note: Huacheng calls 白色雄鹰 and 斗牛士 战队 — TEAMS — operating
 * identical T800s that differ only in armour colour. So they are stored as
 * teams with one machine each, not as robots under EngineAI.
 *
 * Idempotent: everything upserts by slug / unique key.
 */

const SOURCES =
  "Huacheng/GZ-CMC (2026-07-17), People's Daily ent.people.com.cn (2026-07-18)";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  /* ---- Teams ---------------------------------------------------------- */

  const teamRows: Record<string, number> = {};
  for (const team of [
    {
      slug: "white-eagle",
      name: "White Eagle",
      country: "CN",
      orgName: "白色雄鹰 — URKL competing team",
      bio: "Fought the opening bout of URKL's inaugural season in Shenzhen on 16 July 2026, in white-armoured T800s. Landed the moment the sport is so far best known for — a flying kick that took the head clean off its opponent — and still lost the bout 2–3: the decapitated Matador fought on and took the decision.",
    },
    {
      slug: "matador",
      name: "Matador",
      country: "CN",
      orgName: "斗牛士 — URKL competing team",
      bio: "Winner of URKL's opening bout, 16 July 2026 in Shenzhen, 3–2 over five rounds — after White Eagle's flying kick removed its T800's head module in the early going. The machine finished the fight on the platform's distributed torso control, without its primary vision hardware, and was carried off stage in victory. Also reported in English-language media under the translation \"Bullfighter\".",
    },
    {
      slug: "university-of-hong-kong",
      name: "University of Hong Kong",
      country: "HK",
      orgName: "University of Hong Kong",
      bio: "Among the labs reported in the 32-team field of URKL's 2026 season (per People's Daily's account of the qualified field).",
    },
    {
      slug: "uc-berkeley",
      name: "UC Berkeley",
      country: "US",
      orgName: "University of California, Berkeley",
      bio: "Among the labs reported in the 32-team field of URKL's 2026 season (per People's Daily's account of the qualified field).",
    },
  ]) {
    const [row] = await sql`
      insert into teams (slug, name, country, org_name, bio)
      values (${team.slug}, ${team.name}, ${team.country}, ${team.orgName}, ${team.bio})
      on conflict (slug) do update set bio = excluded.bio, org_name = excluded.org_name
      returning id`;
    teamRows[team.slug] = row.id;
    console.log("team:", team.slug, row.id);
  }

  /* ---- Machines ------------------------------------------------------- */

  const robotRows: Record<string, number> = {};
  for (const robot of [
    {
      slug: "white-eagle-t800",
      teamSlug: "white-eagle",
      name: "White Eagle",
      model: "T800",
      weightClass: "Full size",
      heightCm: 173,
      weightGrams: 75_000,
      bio: "White Eagle's white-armoured T800 — league-standard hardware, as all URKL machines are.",
    },
    {
      slug: "matador-t800",
      teamSlug: "matador",
      name: "Matador",
      model: "T800",
      weightClass: "Full size",
      heightCm: 173,
      weightGrams: 75_000,
      bio: "Matador's dark-armoured T800. Finished URKL's opening bout headless and won it — the platform's distributed control kept it blocking and punching after its head module and primary vision were gone.",
    },
  ]) {
    const [row] = await sql`
      insert into robots (slug, team_id, name, model, weight_class, height_cm, weight_grams, bio)
      values (${robot.slug}, ${teamRows[robot.teamSlug]}, ${robot.name}, ${robot.model},
              ${robot.weightClass}, ${robot.heightCm}, ${robot.weightGrams}, ${robot.bio})
      on conflict (slug) do update set bio = excluded.bio, team_id = excluded.team_id
      returning id`;
    robotRows[robot.slug] = row.id;
    console.log("robot:", robot.slug, row.id);
  }

  /* ---- The bout and its result ---------------------------------------- */

  const [event] = await sql`
    select id, competition_id from events where slug = 'urkl-opening-shenzhen-2026'`;
  if (!event) throw new Error("URKL opening event not found — run the league seed first");

  const [bout] = await sql`
    insert into bouts (event_id, competition_id, order_index, robot_a_id, robot_b_id,
                       team_a_id, team_b_id, scheduled_rounds, status)
    values (${event.id}, ${event.competition_id}, 0,
            ${robotRows["white-eagle-t800"]}, ${robotRows["matador-t800"]},
            ${teamRows["white-eagle"]}, ${teamRows["matador"]}, 5, 'completed')
    on conflict (event_id, order_index) do update set status = 'completed'
    returning id`;
  console.log("bout:", bout.id);

  await sql`
    insert into bout_results (bout_id, winner_robot_id, method, notes)
    values (${bout.id}, ${robotRows["matador-t800"]}, 'decision',
            ${`3–2 over five rounds. White Eagle's flying kick removed Matador's head module early; Matador finished the bout on distributed torso control and took the decision. Sources: ${SOURCES}.`})
    on conflict (bout_id) do update
      set winner_robot_id = excluded.winner_robot_id,
          method = excluded.method,
          notes = excluded.notes`;
  console.log("result recorded: Matador def. White Eagle, 3-2 decision");

  const check = await sql`
    select count(*)::int as n from bout_results`;
  console.log("total verified results on site:", check[0].n);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
