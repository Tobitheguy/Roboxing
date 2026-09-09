import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";

/**
 * Fills the site with launch content: five published pieces covering every
 * league on record, plus the organizer logos on the rows that identify them.
 *
 * Editorial ground rules, same as everywhere else on this site:
 *
 * - Every video is EMBEDDED from YouTube, never re-hosted, and every video id
 *   below was verified against YouTube's oEmbed endpoint before being written
 *   here — a 200 with a title, not a guess. A dead id renders a broken player
 *   on launch day.
 * - Every factual claim traces to reporting found in research; where accounts
 *   conflict (the URKL opener's winner) the piece says so instead of picking.
 * - Logos identify the league being reported on — nominative use, the ESPN
 *   convention — files fetched from the organizers' own sites into
 *   /public/leagues.
 *
 * Idempotent: posts upsert by slug, so editing a body here and re-running
 * updates the published piece.
 */

const POSTS = [
  {
    slug: "iron-fist-king-rewatch",
    kind: "article",
    title: "The night robot boxing began: rewatching Iron Fist King",
    summary:
      "On 25 May 2025 in Hangzhou, four Unitree G1s fought the first humanoid boxing tournament ever staged. Everything since is measured against it.",
    embedUrl: "https://www.youtube.com/watch?v=Cr0l7yaqntA",
    eventSlug: "iron-fist-king-awakening-2025",
    body: [
      "Every sport has a night it points back to. For humanoid robot fighting it is 25 May 2025, in Hangzhou, when Unitree put four of its G1 robots in a ring under the name Iron Fist King: Awakening — and discovered, more or less by accident, what audiences actually want from this sport.",
      "The format was simple. Three rounds of two minutes, one point for a hand strike, three for a kick, each robot steered by a human operator. The G1 is a small machine — 1.3 metres, 35 kilos, 23 degrees of freedom — and nobody expected clean technique.",
      "What they got instead was better. The tournament was won by a robot fighting under the name AI Strategist, reported as taking three consecutive knockouts. The moment everyone remembers, though, belongs to its opponent Silk Artisan, which stumbled in the third round and collapsed into a full accidental split. The clip went around the world.",
      "That is the discovery: the falls are the product. A robot throwing a hook is impressive for thirty seconds. A robot going down, and then getting back up on its own, is drama — it reads as effort, and effort is what sport runs on. Every league that came after Iron Fist King is built on machines that can stand back up.",
      "Unitree never published a full card or scorecards, which is why the bout-by-bout record does not appear in our results. What survives is the footage, and it holds up.",
    ],
  },
  {
    slug: "urkl-explained",
    kind: "article",
    title: "URKL, explained: the first real league",
    summary:
      "EngineAI's Ultimate Robot Knock-out Legend has a $1.44M prize pool, a 10-kilogram gold belt, Stanford and Tsinghua in the field — and a scoring system that is nothing like boxing.",
    embedUrl: "https://www.youtube.com/watch?v=GKqDjawv-6k",
    eventSlug: "urkl-opening-shenzhen-2026",
    body: [
      "Exhibitions started this sport. URKL is the first attempt to make it a league — with a season, a field, and money that means it.",
      "Launched by Shenzhen's EngineAI on 9 February 2026, the Ultimate Robot Knock-out Legend drew over 200 teams from 10 countries; 32 came through the online qualifiers, among them Stanford, Tsinghua and Zhejiang University. The prize pool is 10 million yuan — about $1.44 million — and the champion takes a belt made of 10 kilograms of gold.",
      "Two design choices define it. First, every team fights the same machine: EngineAI's T800, a full-size humanoid at 1.73 metres and 75 kilos with 450 newton-metres of peak joint torque, supplied by the league. That makes URKL a contest of software and operators, not of budgets — the same logic as any spec racing series.",
      "Second, the scoring is not boxing. Bouts are judged across balance, power delivery, motion control, decision-making, perception and structural durability. A knockout counts, but so does staying upright, and an engineer would tell you the second is harder.",
      "The season runs in four stages: the 16 July opener in Shenzhen, an August play-in cutting 32 to 16 across Beijing, Zhengzhou, Shanghai and Shenzhen, a group stage, and a grand final reported for Dubai around the turn of the year — no date announced yet.",
      "The opening bout is already a legend, and for months English-language media could not even agree who won it. The Chinese record settles it: White Eagle's flying kick took Matador's head module clean off — and Matador won anyway, 3–2 over five rounds, finishing the fight on the T800's distributed torso control with no primary vision, before being carried off stage in victory. Outlets that saw the kick and stopped watching called it for White Eagle. The full result lives in our records, sourced to Guangzhou's Huacheng and People's Daily — the first verified fight result this sport has in English.",
    ],
  },
  {
    slug: "rek-vr-fight-club",
    kind: "article",
    title: "REK is what happens when America gets the robots",
    summary:
      "No judging rubric, no university teams. San Francisco's REK puts UFC fighters in VR headsets, sells out nightclubs, and just opened a storefront full of six-foot fighting machines.",
    embedUrl: "https://www.youtube.com/watch?v=Iju-0v_yFVk",
    eventSlug: null,
    body: [
      "China's leagues are engineering contests wearing gloves. REK — Robot Entertainment Kombat, founded in San Francisco by Cix Liv — is the other answer: a ticketed show, in a nightclub, where the robots are avatars.",
      "The machines are modified Unitree G1s, about 4.5 feet and 80 pounds, and the pilots wear VR headsets and fight through them with their own bodies. The pilots are the point: REK has put actual professional fighters in the headset, including UFC featherweight Hyder Amil and MMA veteran Jessica-Rose Clark. When the robot throws a combination, a fighter threw it.",
      "It sells. Tickets ran $60 to $80 in San Francisco, and by August 2026 REK listed twelve events across eight cities. An America tour through Los Angeles, Las Vegas, Austin, Miami and New York reportedly sold out every stop — reporting on the exact dates is contradictory, which is why no REK fixtures appear in our calendar yet, but the sell-outs themselves were reported repeatedly.",
      "The most interesting move is the newest one: a San Francisco storefront where the public can watch, train on, and eventually rent or buy fighting humanoids — with six-foot machines already on the floor. Liv has said the plan is a full league on purpose-built robots of roughly six feet and 200 pounds. If URKL is building a Formula 1, REK is building a boxing gym with merch — and it is not obvious the second is the worse business.",
    ],
  },
  {
    slug: "whrg-2026-recap",
    kind: "article",
    title: "Beijing 2026: the Games where robots beat human world records",
    summary:
      "2,056 robots, 666 teams, 16 countries. AGIBOT topped the medal table on debut, Tiangong Ultra ran 100m in 8.64 seconds, and the fighting happened in three weight classes.",
    embedUrl: null,
    eventSlug: "world-humanoid-robot-games-2026",
    body: [
      "The World Humanoid Robot Games are only partly a fighting event — combat shares the programme with football, athletics, wushu, weightlifting and tug of war. But they are the biggest stage this sport has, and the second edition, in Beijing from 22 to 26 August 2026, was more than three times the size of the first: 2,056 robots and 666 teams from 16 countries across 51 events.",
      "The fighting is contested as Free Combat, in 40, 58 and 80-kilogram classes; kickboxing permits a human in the loop rather than requiring full autonomy. Per-bout results have so far been published only in the organizer's Chinese-language documents — which is exactly the gap this site exists to close, and we are working through them.",
      "The medal story belonged to AGIBOT, which entered its first Games and left with 18 gold and 46 medals in total, topping both tables. Its titles ran from martial arts to dance to obstacle racing.",
      "The headline, though, ran on a track. Tiangong Ultra, from the Beijing Humanoid Robot Innovation Center, won the 100 metres in 9.39 seconds on the opening weekend, cut it to 8.86 in a semifinal, and closed the Games at 8.64 — faster than any human being has ever run it. By the closing ceremony, Tiangong machines had beaten four human world records: the 100, the 400, the 1500 and the high jump.",
      "It took sixty years to get from the first industrial robot to one that outsprints Usain Bolt, and about eighteen months to get from robots that could box to robots doing it in front of a stadium. The next Games are going to be worth a plane ticket.",
    ],
  },
  {
    slug: "five-leagues-explained",
    kind: "article",
    title: "The five leagues of humanoid robot fighting, explained",
    summary:
      "Who runs what, on which machines, for how much money — the map of a sport that did not exist two years ago.",
    embedUrl: null,
    eventSlug: null,
    body: [
      "Two years ago this sport did not exist. Today there are five distinct properties staging humanoid robot fights, on three continents, with almost no overlap in format, hardware or philosophy. This is the map.",
      "IRON FIST KING (Unitree, Hangzhou) is where it started: a one-off exhibition on 25 May 2025, four child-size G1 robots, human operators, the world's first robot boxing tournament. Not a league — the big bang.",
      "URKL (EngineAI, Shenzhen) is the first real league. One standard machine for everyone — EngineAI's full-size T800 — hybrid human-machine control, judged on engineering criteria as much as damage, a 10 million yuan prize pool and a solid gold belt. Over 200 teams entered the 2026 season, including Stanford and Tsinghua; the final is expected in Dubai.",
      "CYBERHERO (Hero Esports, debuting in Riyadh) is the entertainment play: the same T800 hardware as URKL, but driven by professional Street Fighter players, staged as a two-hour show with a DJ. Asia's largest esports company treating robot fighting as esports with a physical avatar.",
      "THE WORLD HUMANOID ROBOT GAMES (Beijing) are the Olympics of this world — fighting is one discipline among 51, in three weight classes, alongside sprints where robots now beat human world records. The 2026 edition drew 666 teams from 16 countries.",
      "REK (San Francisco) is the American counterculture version: VR-piloted Unitree G1s, nightclub venues, UFC fighters in the headset, a sold-out national tour, and a storefront that rents fighting machines. Planning its own league on six-foot, 200-pound purpose-built robots.",
      "Five properties, three models — engineering contest, entertainment product, national showcase — and none of them older than eighteen months. Whoever wins, the sport has stopped being hypothetical. This site keeps the record: every league, every event, every result we can verify, in English.",
    ],
  },
  {
    slug: "unitree-autonomous-combat",
    kind: "article",
    title: "No pilot: Unitree just showed the first autonomous robot fight",
    summary:
      "Every fight this sport has ever staged had a human in the loop. Unitree's UnifoLM-X2-1.0 world model drops the human — and the watcher caught the story in Chinese media before English outlets had it.",
    // Unitree's own upload, verified through YouTube's oEmbed endpoint as
    // coming from the @unitreerobotics channel — the claim in this article is
    // the company's, so the source has to be the company's.
    embedUrl: "https://www.youtube.com/watch?v=qkIJELDgULA",
    eventSlug: null,
    body: [
      "Strip away the armour and the gold belts, and every fight this sport has staged so far shares one fact: a human was driving. VR pilots at [REK](https://www.youtube.com/watch?v=PR7yNhfHAKg), operators with controllers at Iron Fist King, hybrid human-machine control at URKL, professional Street Fighter players at CyberHero. The robots were avatars.",
      "On 7 September, Unitree published [a video](https://www.youtube.com/watch?v=qkIJELDgULA) that removes that fact. [UnifoLM-X2-1.0](https://x.com/UnitreeRobotics/status/2096932273602048258) is what the company calls a real-time world model: the robot watches the situation in front of it, predicts how the next moments of physical contact will unfold, plans a response, executes it, and repeats — no teleoperation, no scripted sequences. Unitree calls it the first fully autonomous humanoid robot combat, and no earlier demonstration we can find contradicts the claim.",
      "The caveats matter and we will keep repeating them: this is a company demo video, not a sanctioned bout under any league's rules, and a demo is exactly the setting where a system looks its best. Nothing about it appears in our results, and nothing should.",
      "But if it holds up outside the demo, it changes what this sport is. A league of piloted robots is an operator competition — esports with a physical avatar, as CyberHero understands perfectly. A league of autonomous robots is something that has never existed: machine versus machine, where the thing being tested is the intelligence itself. URKL already scores decision-making and perception alongside power and balance; autonomy is where that rubric stops being a metaphor.",
      "One more thing worth saying plainly: this story broke across Chinese tech media a day before English outlets caught up, and our morning sweep of Chinese-language sources flagged it at dawn. That pipeline exists because the last time a story lived only in Chinese, it took this site to put the result on the record in English. It will not be the last time.",
    ],
  },
  {
    /*
     * Brought into this file on 2026-09-09. It had been created through the
     * admin and lived ONLY in the database — no source-controlled origin, so
     * no diff, no review, and no way to correct it except by hand. STATUS
     * claimed it was already here; it was not.
     *
     * The correction that prompted the move: the body said the fight was
     * "tomorrow night", written the day before. By the morning of the event
     * that sentence was simply false on a live page. Relative time does not
     * belong in a post body — the reader's today is not the writer's.
     */
    slug: "cyberhero-riyadh-preview",
    kind: "article",
    title: "CyberHero x Riyadh: the Middle East gets its first robot fight night",
    summary:
      "Ten EngineAI T800s, two squads of three, best-of-seven, and no live stream. What to expect from Hero Esports' debut on 9 September.",
    embedUrl: null,
    eventSlug: "cyberhero-riyadh-2026",
    body: [
      "Ten EngineAI T800 humanoids fight in Riyadh on the evening of 9 September, and it is the first time this sport has been staged in the Middle East.",
      "The T800 is the same machine URKL standardised on in China: about 1.73 metres and 75 to 85 kilos, roughly the size of an adult man, with 29 articulated joints. It walks, runs, punches, kicks, turns, and — the part audiences actually come for — gets back up after going down.",
      "The format is published, and it is closer to a fighting game than to a fight card. Two squads of three robots meet in a best-of-seven series of one-on-one rounds. Each robot carries 30 hit points; a round ends when three minutes elapse or a robot is knocked out at zero. A knocked-out machine is replaced rather than ending the tie, and the squad with more robots still standing takes it. That substitution rule is the likeliest reason ten T800s are in the building for six starting places.",
      "The pilots are the tell. URKL fields engineers and university teams and scores its bouts on balance, power delivery and structural durability. CyberHero has the robots driven by two professional Street Fighter players. Same hardware, completely different sport: one is a robotics benchmark, the other is esports with a physical avatar.",
      "That fits what Hero Esports is: Asia's largest esports company, staging this as a two-hour show with music and lighting and a set from the producer Tokyo Machine, rather than as a technical competition.",
      "One thing to know before you look for it: there is no stream. The organizer's own FAQ says the event will not be broadcast live — it is being professionally recorded, with highlights released afterwards on CyberHero's channels. If you are not in the room, you are waiting for the edit.",
      "Doors at 8:30 PM, first fight at 9:00 PM, at MBC Studio 1 in Boulevard City.",
      "Neither squad has been named and neither pilot has been identified, so this site lists no card for the event. Nothing goes on the record here until there is a source for it.",
    ],
  },
] as const;

const LOGOS: Array<{ table: "competitions" | "teams"; slug: string; url: string }> = [
  // League marks, each fetched from an official source and brightness-checked
  // so none disappears on the white badge tile:
  //   cyberhero  — wordmark from cyber.hero.com
  //   urkl       — wordmark from EngineAI's own tournament page
  //   whrg       — the Games' official logo (via its Wikipedia infobox file)
  //   rek        — REK's mark from its Founders Inc profile
  //   iron-fist-king — Unitree's logo standing in as ORGANIZER mark: the
  //     event was a one-off and never had its own published emblem.
  { table: "competitions", slug: "cyberhero", url: "/leagues/cyberhero.png" },
  { table: "competitions", slug: "urkl", url: "/leagues/urkl.png" },
  {
    table: "competitions",
    slug: "world-humanoid-robot-games",
    url: "/leagues/whrg.png",
  },
  { table: "competitions", slug: "rek", url: "/leagues/rek.png" },
  { table: "competitions", slug: "iron-fist-king", url: "/leagues/unitree.jpg" },
  // Organizer logos on the teams that represent those organisations.
  { table: "teams", slug: "engineai", url: "/leagues/engineai.png" },
  { table: "teams", slug: "unitree-robotics", url: "/leagues/unitree.jpg" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);

  for (const post of POSTS) {
    let eventId: number | null = null;
    if (post.eventSlug) {
      const [event] = await sql`select id from events where slug = ${post.eventSlug}`;
      if (!event) throw new Error(`event not found: ${post.eventSlug}`);
      eventId = event.id;
    }

    const body = post.body.join("\n\n");
    await sql`
      insert into posts (slug, kind, status, title, summary, body, embed_url, event_id, published_at)
      values (${post.slug}, ${post.kind}, 'published', ${post.title}, ${post.summary},
              ${body}, ${post.embedUrl}, ${eventId}, now())
      on conflict (slug) do update
        set title = excluded.title, summary = excluded.summary, body = excluded.body,
            embed_url = excluded.embed_url, event_id = excluded.event_id,
            status = 'published',
            published_at = coalesce(posts.published_at, now()),
            updated_at = now()`;
    console.log(`published: ${post.slug}${post.embedUrl ? " (with video)" : ""}`);
  }

  for (const logo of LOGOS) {
    if (logo.table === "competitions") {
      await sql`update competitions set logo_url = ${logo.url} where slug = ${logo.slug}`;
    } else {
      await sql`update teams set logo_url = ${logo.url} where slug = ${logo.slug}`;
    }
    console.log(`logo: ${logo.table}/${logo.slug} -> ${logo.url}`);
  }

  const visible = await sql`
    select slug, kind, embed_url is not null as video from posts
    where status='published' and published_at <= now() order by published_at desc`;
  console.log("\nlive posts:", visible);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
