import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * The record build-out: leagues, schedule, results, people, machines, channels,
 * entry routes and open questions.
 *
 * SCOPE: HUMANOID ONLY.
 * -----------------------
 * This site covers bipedal humanoid robot fighting and nothing adjacent to it.
 * Robowar (a human inside a nine-foot mech), NHRL (wheeled destructive combat)
 * and Unitree's GD01 (a 500 kg piloted vehicle) were all carried for a while,
 * walled off in their own classes and excluded from every standings table, and
 * they are gone — see scripts/humanoid-only.ts. A wall is not the same as a
 * promise kept.
 *
 * Do not add a non-humanoid row here. `competition_class` and `robots.class`
 * still exist as the guard that keeps one out of the standings if anyone tries.
 *
 * Idempotent. Every write is an upsert keyed on a slug, so running it twice
 * changes nothing the second time and running it after a hand-edit in the admin
 * console overwrites that edit — which is the trade being made deliberately.
 * This file is the source of the facts below; the admin console is for what
 * comes after.
 *
 * THE RULE THIS FILE IS WRITTEN UNDER
 * -----------------------------------
 * Nothing here is invented. Where a fact is not known, the row says so:
 * `confidence` is `unconfirmed`, the prose states what is missing, and an
 * `open_questions` row tracks it. Where a source URL was not actually seen, it
 * is left NULL rather than guessed — a plausible-looking citation that does not
 * resolve is worse than no citation, because it converts an honest gap into a
 * lie a reader can only catch by clicking.
 *
 * That is why several rows below carry real detail and no link. They are
 * sourced to reporting that exists; the specific URL was not verified here.
 *
 * Usage: npm run db:seed-record
 */

async function main() {
  const { db } = await import("../src/db");
  const {
    bouts,
    boutResults,
    competitions,
    entryRoutes,
    events,
    manufacturers,
    openQuestions,
    pilots,
    posts,
    robots,
    teams,
  } = await import("../src/db/schema");
  const { eq, inArray, sql } = await import("drizzle-orm");

  const D = (iso: string) => new Date(iso);

  /* ---------------------------------------------------------------------- */
  /* 1. Manufacturers — who builds, as distinct from who fights              */
  /* ---------------------------------------------------------------------- */

  console.log("Manufacturers…");
  const MAKERS = [
    {
      slug: "unitree",
      name: "Unitree Robotics",
      nameLocal: "宇树科技",
      country: "CN",
      foundedYear: 2016,
      websiteUrl: "https://www.unitree.com",
      bio: "Hangzhou maker of the G1, H1-2 and H2. The platform most humanoid fighting has been staged on: the four robots in the first Iron Fist King tournament were G1s, and Unitree became UFB's official robotics partner in November 2025. Added to the US Department of War's Section 1260H list in June 2026 — a designation that binds the Department, not private buyers.",
      confidence: "confirmed" as const,
    },
    {
      slug: "engineai",
      name: "EngineAI",
      nameLocal: "众擎机器人",
      country: "CN",
      foundedYear: 2023,
      websiteUrl: "https://en.engineai.com.cn",
      bio: "Shenzhen maker of the T800, and the only manufacturer that also runs a league: EngineAI founded URKL and supplies every competing team an identical machine free of charge. Also staged Mecha King in December 2025. Reportedly had no FCC equipment authorization on record for the T800 as of August 2026.",
      confidence: "confirmed" as const,
    },
    {
      slug: "booster-robotics",
      name: "Booster Robotics",
      country: "CN",
      websiteUrl: "https://www.boosterobotics.com",
      bio: "Maker of the T1, used alongside the Unitree G1 at UFB's San Francisco events. Swept the RoboCup 2026 humanoid titles.",
      confidence: "reported" as const,
    },
    {
      slug: "x-humanoid",
      name: "X-Humanoid",
      nameLocal: "北京人形机器人创新中心",
      country: "CN",
      bio: "Beijing Humanoid Robot Innovation Center, maker of Tiangong Ultra — which set the headline track records at the 2026 World Humanoid Robot Games. Its 100 m time is reported as both 8.86 s and 9.39 s depending on the source.",
      confidence: "reported" as const,
    },
    {
      slug: "agibot",
      name: "AGIBOT",
      nameLocal: "智元机器人",
      country: "CN",
      bio: "Topped the medal table at the 2026 World Humanoid Robot Games with 18 gold, 16 silver and 12 bronze.",
      confidence: "reported" as const,
    },
  ];

  for (const m of MAKERS) {
    await db
      .insert(manufacturers)
      .values(m)
      .onConflictDoUpdate({ target: manufacturers.slug, set: m });
  }

  const makerId = new Map(
    (
      await db
        .select({ id: manufacturers.id, slug: manufacturers.slug })
        .from(manufacturers)
    ).map((r) => [r.slug, r.id]),
  );

  /* ---------------------------------------------------------------------- */
  /* 2. Competitions                                                         */
  /* ---------------------------------------------------------------------- */

  console.log("Competitions…");
  const LEAGUES = [
    {
      slug: "ufb",
      name: "Ultimate Bots",
      organizer: "Ultimate Fighting Bots",
      seasonYear: 2026,
      status: "active" as const,
      class: "humanoid" as const,
      country: "US",
      city: "San Francisco",
      foundedYear: 2025,
      websiteUrl: "https://ultimatebots.com",
      confidence: "confirmed" as const,
      description: `Ultimate Fighting Bots, trading as Ultimate Bots, is the largest American humanoid fighting league and the one this site was missing.

It began in 2025 as invite-only fights in the basement of Frontier Tower on Market Street in San Francisco, the first in July, founded by Vitaly Bulatov, Xenia Bulatov and Michael Cho. Season 1 moved to Temple SF.

The machines are Unitree G1s and Booster T1s, driven with standard game controllers — and, unusually, from a browser, which means a pilot can compete from anywhere. Unitree became the league's official robotics partner in November 2025. In January 2026 UFB staged a humanoid bout inside the BattleBox at CES, in partnership with BattleBots.

Season 2 runs 1 October 2026 to 31 March 2027: four teams, a $100,000 prize pool, and a league-assigned Unitree G1 for every team, so nobody has to buy a robot to enter. Other partners include Nebius, Weights & Biases, MongoDB and Virgin Music Group.`,
    },
    {
      slug: "cmg-2026",
      name: "CMG2026 Robot Mecha Fighting Competition",
      organizer: "China Media Group (CCTV)",
      seasonYear: 2026,
      status: "active" as const,
      class: "humanoid" as const,
      country: "CN",
      foundedYear: 2026,
      confidence: "confirmed" as const,
      description: `China Media Group — the Chinese state broadcaster, CCTV — unveiled this competition on 10 June 2026 at its 5th Global Media Innovation Forum in Chongqing, and opened global recruitment the following day.

It runs in three stages: an industry expo, qualification rounds, and a championship finale described as full-size autonomous combat. The headline machine is the full-size Unitree H2.

Two things make it unusual. There are two entry routes, and the second one requires no robot: alongside companies and developer groups bringing their own humanoids, individual operators can compete by remote, voice or motion-sensing control. And CMG claims the first human-machine collaborative motion-capture confrontation, using mocap gloves, flexible robot skin and machine vision to quantify every punch and dodge.

The finals date and venue have not been published.`,
    },
    {
      slug: "engineai-mecha-king",
      name: "Mecha King",
      organizer: "EngineAI",
      seasonYear: 2025,
      status: "completed" as const,
      class: "humanoid" as const,
      country: "CN",
      city: "Shenzhen",
      confidence: "reported" as const,
      description: `机甲王 — billed as the first full-size humanoid free-combat championship, staged by EngineAI in Shenzhen on 24 December 2025.

EngineAI open-sourced the robot code beforehand so competing teams could customise and train their own fighters, the same "standardised hardware, differentiated algorithms" principle it would later build URKL on.

No winner has ever been published. See Open Questions.`,
    },
    {
      slug: "exhibitions",
      name: "Exhibitions and demonstrations",
      status: "active" as const,
      class: "humanoid" as const,
      isLeague: false,
      confidence: "confirmed" as const,
      description: `Not a league. A container for staged humanoid bouts that belong to no competition — manufacturer demonstrations, promotional showcases and one-off spectacles.

Nothing here is a sanctioned result and nothing here reaches a standings table. It is recorded because these events are frequently the first time a machine fights in public, and because leaving them out would make the record look thinner than the sport actually is.`,
    },
  ];

  for (const c of LEAGUES) {
    await db
      .insert(competitions)
      .values(c)
      .onConflictDoUpdate({ target: competitions.slug, set: c });
  }

  // Enrich the five leagues that already existed. Deliberately a narrow patch
  // rather than a full upsert: their descriptions were written by hand and are
  // better than anything this script would put back.
  const ENRICH: Record<
    string,
    Partial<typeof competitions.$inferInsert>
  > = {
    urkl: {
      class: "humanoid",
      country: "CN",
      city: "Shenzhen",
      websiteUrl: "https://en.engineai.com.cn",
      confidence: "confirmed",
    },
    cyberhero: {
      class: "humanoid",
      country: "SA",
      city: "Riyadh",
      confidence: "confirmed",
      sourceUrl:
        "https://www.prnewswire.com/news-releases/hero-esports-to-stage-middle-easts-first-humanoid-robot-kickboxing-event-in-riyadh-302864961.html",
    },
    "world-humanoid-robot-games": {
      class: "humanoid",
      country: "CN",
      city: "Beijing",
      confidence: "confirmed",
    },
    rek: { class: "humanoid", country: "US", confidence: "reported" },
    "iron-fist-king": {
      class: "humanoid",
      country: "CN",
      city: "Hangzhou",
      confidence: "confirmed",
    },
  };
  for (const [slug, patch] of Object.entries(ENRICH)) {
    await db.update(competitions).set(patch).where(eq(competitions.slug, slug));
  }

  const compId = new Map(
    (
      await db
        .select({ id: competitions.id, slug: competitions.slug })
        .from(competitions)
    ).map((r) => [r.slug, r.id]),
  );
  const C = (slug: string) => {
    const id = compId.get(slug);
    if (!id) throw new Error(`No competition "${slug}"`);
    return id;
  };

  /* ---------------------------------------------------------------------- */
  /* 3. Teams — competitors only                                             */
  /* ---------------------------------------------------------------------- */

  console.log("Teams…");
  const TEAMS = [
    {
      slug: "team-fba",
      name: "Team FBA",
      country: "CN",
      orgName: "CyberHero competing team",
      bio: "Won the first CyberHero event in Riyadh, beating Team Al Majd 4–3 over seven rounds. Named by Xinhua's English service; no other outlet has published the team names.",
    },
    {
      slug: "team-al-majd",
      name: "Team Al Majd",
      country: "SA",
      orgName: "CyberHero competing team",
      bio: "Runner-up at the first CyberHero event in Riyadh, losing 4–3 in the seventh round. Named by Xinhua's English service alone.",
    },
    {
      slug: "ai-strategist",
      name: "AI Strategist",
      country: "CN",
      orgName: "AI策算师 — Iron Fist King entry",
      bio: "The entry that won the first Iron Fist King tournament, piloted by Lu Xin. As at URKL, the entry name and the machine's fighting name are the same.",
    },
    {
      slug: "energy-guardian",
      name: "Energy Guardian",
      country: "CN",
      orgName: "Iron Fist King entry",
      bio: "Runner-up in the first Iron Fist King final, piloted by Hu Yunqian.",
    },
  ];
  for (const t of TEAMS) {
    await db
      .insert(teams)
      .values(t)
      .onConflictDoUpdate({ target: teams.slug, set: t });
  }

  const teamId = new Map(
    (await db.select({ id: teams.id, slug: teams.slug }).from(teams)).map(
      (r) => [r.slug, r.id],
    ),
  );
  const T = (slug: string) => {
    const id = teamId.get(slug);
    if (!id) throw new Error(`No team "${slug}"`);
    return id;
  };

  /* ---------------------------------------------------------------------- */
  /* 4. Machines                                                             */
  /* ---------------------------------------------------------------------- */

  console.log("Machines…");

  // Platform models: no team, because nobody owns a product. This is the fix
  // for Unitree appearing to fight itself.
  const PLATFORMS = [
    {
      slug: "unitree-g1",
      name: "G1",
      model: "G1",
      manufacturerId: makerId.get("unitree"),
      teamId: null,
      heightCm: 132,
      weightGrams: 35_000,
      degreesOfFreedom: 23,
      priceUsd: 13_500,
      priceNote: "Base EDU configuration; combat variants cost several times this.",
      purchaseUrl: "https://www.unitree.com/g1",
      usAvailability:
        "Certified before the FCC's 28 July 2026 Covered List notice, so existing authorizations stand and used units and continued operation are unaffected. Future models are the exposure.",
      class: "humanoid" as const,
      confidence: "confirmed" as const,
      bio: "The machine most humanoid fighting has been staged on. All four robots in the first Iron Fist King tournament were G1s, and it is the platform UFB assigns to its Season 2 teams.",
    },
    {
      slug: "engineai-t800",
      name: "T800",
      model: "T800",
      manufacturerId: makerId.get("engineai"),
      teamId: null,
      heightCm: 173,
      degreesOfFreedom: 29,
      class: "humanoid" as const,
      confidence: "confirmed" as const,
      usAvailability:
        "Reportedly had no FCC equipment authorization on record as of August 2026.",
      bio: "Full-size, about 1.73 m and 75–85 kg — the size of a grown man, which is most of why a T800 bout reads differently from a G1 bout. URKL issues an identical T800 to every competing team free of charge and lets them differentiate on algorithms alone. Ten of them fought at CyberHero's Riyadh launch.",
    },
    {
      slug: "unitree-h1-2",
      name: "H1-2",
      model: "H1-2",
      manufacturerId: makerId.get("unitree"),
      teamId: null,
      heightCm: 183,
      weightGrams: 70_000,
      priceUsd: 100_000,
      priceNote: "Approximate; Unitree does not publish a list price.",
      purchaseUrl: "https://www.unitree.com",
      class: "humanoid" as const,
      confidence: "reported" as const,
      bio: 'REK is moving to this machine. Its founder Cix Liv described being hit by one as "like a motorized bat" — a useful corrective to the idea that these are toys.',
    },
    {
      slug: "unitree-h2",
      name: "H2",
      model: "H2",
      manufacturerId: makerId.get("unitree"),
      teamId: null,
      heightCm: 183,
      weightGrams: 70_000,
      degreesOfFreedom: 31,
      priceNote: "Not published.",
      class: "humanoid" as const,
      confidence: "reported" as const,
      usAvailability:
        "Authorized before the July 2026 FCC notice; existing units unaffected.",
      bio: "The headline machine for CMG's 2026 competition, and the robot in the December 2025 sparring video against a G1 — in which the H2 was driven by a full-body motion-capture suit, not autonomy.",
    },
    {
      slug: "unitree-g1-combat",
      name: "G1 EDU Combat Edition",
      model: "G1 EDU Combat / Boxing Edition",
      manufacturerId: makerId.get("unitree"),
      teamId: null,
      heightCm: 132,
      weightGrams: 35_000,
      priceUsd: 63_900,
      priceNote: "Via Robots International, Las Vegas.",
      purchaseUrl: "https://www.unitree.com/g1",
      usAvailability:
        "Sold in the US through Robots International, Las Vegas. Ships with a repair subsidy rather than a warranty — the vendor's own acknowledgement that a fighting robot is a consumable.",
      class: "humanoid" as const,
      confidence: "reported" as const,
      bio: "A G1 with a reinforced waist and arms, a Jetson Orin NX, gloves and a helmet. The reinforcement is the product: a standard G1 is not built to be hit repeatedly.",
    },
    {
      slug: "booster-t1",
      name: "T1",
      model: "T1",
      manufacturerId: makerId.get("booster-robotics"),
      teamId: null,
      priceUsd: 33_949,
      priceNote: "Approximate.",
      purchaseUrl: "https://www.boosterobotics.com",
      class: "humanoid" as const,
      confidence: "reported" as const,
      bio: "Used alongside the G1 at UFB's San Francisco events, and swept the humanoid titles at RoboCup 2026 — a pedigree in autonomous football rather than fighting.",
    },
  ];

  for (const r of PLATFORMS) {
    await db
      .insert(robots)
      .values(r)
      .onConflictDoUpdate({ target: robots.slug, set: r });
  }

  // Fighters: a machine entered by a team, under a fighting name.
  const FIGHTERS = [
    {
      slug: "white-eagle-t800",
      name: "White Eagle",
      model: "T800",
      manufacturerId: makerId.get("engineai"),
      teamId: T("white-eagle"),
      class: "humanoid" as const,
      confidence: "confirmed" as const,
    },
    {
      slug: "matador-t800",
      name: "Matador",
      model: "T800",
      manufacturerId: makerId.get("engineai"),
      teamId: T("matador"),
      class: "humanoid" as const,
      confidence: "confirmed" as const,
      bio: "Decapitated by a tornado kick from White Eagle in URKL's opening round, kept fighting, and won three of the five rounds.",
    },
    {
      slug: "ai-strategist-g1",
      name: "AI Strategist",
      model: "G1",
      manufacturerId: makerId.get("unitree"),
      teamId: T("ai-strategist"),
      class: "humanoid" as const,
      confidence: "reported" as const,
      heightCm: 132,
      weightGrams: 35_000,
      bio: "AI策算师. Won the first Iron Fist King tournament on 25 May 2025, piloted by Lu Xin.",
    },
    {
      slug: "energy-guardian-g1",
      name: "Energy Guardian",
      model: "G1",
      manufacturerId: makerId.get("unitree"),
      teamId: T("energy-guardian"),
      class: "humanoid" as const,
      confidence: "reported" as const,
      heightCm: 132,
      weightGrams: 35_000,
      bio: "Runner-up in the first Iron Fist King final, piloted by Hu Yunqian.",
    },
  ];
  for (const r of FIGHTERS) {
    await db
      .insert(robots)
      .values(r)
      .onConflictDoUpdate({ target: robots.slug, set: r });
  }

  const robotId = new Map(
    (await db.select({ id: robots.id, slug: robots.slug }).from(robots)).map(
      (r) => [r.slug, r.id],
    ),
  );
  const R = (slug: string) => {
    const id = robotId.get(slug);
    if (!id) throw new Error(`No robot "${slug}"`);
    return id;
  };

  /* ---------------------------------------------------------------------- */
  /* 5. Pilots — the humans                                                  */
  /* ---------------------------------------------------------------------- */

  console.log("Pilots…");
  const PEOPLE = [
    {
      slug: "lu-xin",
      name: "Lu Xin",
      nameLocal: "陆鑫",
      role: "pilot" as const,
      nationality: "CN",
      competitionId: C("iron-fist-king"),
      notableResult:
        "Won the first humanoid boxing tournament ever held, 25 May 2025.",
      bio: "Piloted AI Strategist to victory in the Iron Fist King: Awakening final in Hangzhou, beating Energy Guardian over three rounds. The robots were Unitree G1s driven remotely, their movements trained from motion capture of professional kickboxers — which makes Lu Xin, as far as any public record shows, the first person to win a humanoid fighting tournament.",
      confidence: "reported" as const,
    },
    {
      slug: "hu-yunqian",
      name: "Hu Yunqian",
      nameLocal: "胡云千",
      role: "pilot" as const,
      nationality: "CN",
      competitionId: C("iron-fist-king"),
      notableResult: "Runner-up, Iron Fist King: Awakening, 25 May 2025.",
      bio: "Piloted Energy Guardian in the first Iron Fist King final. Reported to have been knocked down in all three rounds.",
      confidence: "reported" as const,
    },
    {
      slug: "cix-liv",
      name: "Cix Liv",
      role: "founder" as const,
      nationality: "US",
      competitionId: C("rek"),
      affiliation: "Founder, REK",
      notableResult: "Founded REK; previously founded LIV.",
      bio: 'Founded REK after LIV, a mixed-reality capture and VR streaming company. On being hit by a Unitree H1-2: "like a motorized bat."',
      confidence: "reported" as const,
    },
    {
      slug: "amanda-watson",
      name: "Amanda Watson",
      role: "engineer" as const,
      nationality: "US",
      competitionId: C("rek"),
      affiliation: "CTO, REK",
      notableResult: "VR latency specialist; CTO of REK.",
      bio: "Chief technology officer at REK, with a background in VR latency — the problem at the centre of remote piloting, where the gap between a pilot's hand moving and a robot's arm moving decides whether a fight looks like a fight.",
      confidence: "reported" as const,
    },
    {
      slug: "justin-kan",
      name: "Justin Kan",
      role: "pilot" as const,
      nationality: "US",
      competitionId: C("rek"),
      affiliation: "Co-founder, Twitch",
      notableResult: "Has piloted at REK.",
      bio: "Twitch co-founder, and one of the people whose presence in the pilot's seat says most about where this sport thinks its audience comes from.",
      confidence: "reported" as const,
    },
    {
      slug: "hyder-amil",
      name: "Hyder Amil",
      role: "pilot" as const,
      nationality: "US",
      competitionId: C("rek"),
      affiliation: "UFC veteran",
      notableResult: "Has piloted at REK.",
      bio: "A UFC fighter who has driven a humanoid at REK — the clearest test available of whether combat-sport skill transfers to a controller.",
      confidence: "reported" as const,
    },
    {
      slug: "wang-xingxing",
      name: "Wang Xingxing",
      nameLocal: "王兴兴",
      role: "executive" as const,
      nationality: "CN",
      affiliation: "Founder and CEO, Unitree Robotics",
      notableResult:
        "Founded Unitree, whose G1 is the platform most humanoid fighting is staged on.",
      bio: "Founded Unitree in 2016. Its G1 was the machine in all four corners of the first Iron Fist King tournament, and Unitree became UFB's official robotics partner in November 2025. He met Dana White at the UFC's Shanghai humanoid exhibition in August 2025. In September 2026 Unitree claimed the first fully autonomous humanoid combat, a claim nobody outside the company has verified.",
      confidence: "reported" as const,
    },
    {
      slug: "zhao-tongyang",
      name: "Zhao Tongyang",
      nameLocal: "赵同阳",
      role: "founder" as const,
      nationality: "CN",
      competitionId: C("urkl"),
      affiliation: "CEO, EngineAI",
      notableResult: "Founded URKL, the first standardised humanoid fight league.",
      bio: "Previously led robotics at XPeng. As EngineAI's CEO he built the T800 and then founded a league that gives every team the same one — standardised hardware, differentiated algorithms — which is the single most consequential design decision anyone in this sport has made.",
      confidence: "reported" as const,
    },
    {
      slug: "dana-white",
      name: "Dana White",
      role: "referee" as const,
      nationality: "US",
      affiliation: "President, UFC",
      notableResult:
        "Refereed the humanoid exhibition at UFC Fight Night 257, Shanghai, 23 August 2025.",
      bio: "The UFC president refereed a robot exhibition on a UFC card in Shanghai and met Unitree's CEO there. A promotional demonstration rather than a sanctioned bout, and still the closest this sport has come to mainstream combat-sports legitimacy.",
      confidence: "reported" as const,
    },
  ];
  for (const p of PEOPLE) {
    await db
      .insert(pilots)
      .values(p)
      .onConflictDoUpdate({ target: pilots.slug, set: p });
  }

  const pilotId = new Map(
    (await db.select({ id: pilots.id, slug: pilots.slug }).from(pilots)).map(
      (r) => [r.slug, r.id],
    ),
  );
  const P = (slug: string) => pilotId.get(slug) ?? null;

  /* ---------------------------------------------------------------------- */
  /* 6. Events — the schedule, the backfill and the exhibitions              */
  /* ---------------------------------------------------------------------- */

  console.log("Events…");
  const EVENTS: (typeof events.$inferInsert)[] = [
    /* ---- Scheduled ---------------------------------------------------- */
    {
      slug: "ufb-season-2",
      competitionId: C("ufb"),
      name: "UFB Season 2",
      country: "US",
      startsAt: D("2026-10-01T00:00:00Z"),
      endsAt: D("2027-03-31T23:59:59Z"),
      startTimeTbd: true,
      timezone: "America/Los_Angeles",
      status: "scheduled",
      confidence: "reported",
      note: "Four teams, a $100,000 prize pool, and a league-assigned Unitree G1 for each — no robot purchase required. Treat the start date as needing confirmation: UFB's own site displays the season as running 1 October 2027 to 31 March 2027, which cannot be right and is believed to be a typo for 2026.",
      sourceUrl: "https://ultimatebots.com",
    } as typeof events.$inferInsert,
    {
      slug: "urkl-later-rounds-2026",
      competitionId: C("urkl"),
      name: "URKL later rounds",
      country: "CN",
      startsAt: D("2026-09-15T00:00:00Z"),
      endsAt: D("2026-10-31T23:59:59Z"),
      startTimeTbd: true,
      dateTbd: true,
      dateLabel: "September–October 2026",
      timezone: "Asia/Shanghai",
      status: "scheduled",
      confidence: "reported",
      note: "The group stage and single-elimination rounds that follow July's opener. Individual dates have not been published.",
    },
    {
      slug: "urkl-grand-final-dubai",
      competitionId: C("urkl"),
      name: "URKL Grand Final",
      city: "Dubai",
      country: "AE",
      startsAt: D("2026-12-01T00:00:00Z"),
      startTimeTbd: true,
      dateTbd: true,
      dateLabel: "December 2026 / January 2027",
      timezone: "Asia/Dubai",
      status: "scheduled",
      confidence: "reported",
      note: "Confirmed for Dubai; the exact date has not been announced. The prize is a 10 kg solid gold belt worth roughly RMB 10 million (about US$1.44 million).",
    },
    {
      slug: "whrg-2027",
      competitionId: C("world-humanoid-robot-games"),
      name: "World Humanoid Robot Games 2027",
      city: "Beijing",
      country: "CN",
      startsAt: D("2027-08-01T00:00:00Z"),
      startTimeTbd: true,
      dateTbd: true,
      dateLabel: "August 2027, expected",
      timezone: "Asia/Shanghai",
      status: "scheduled",
      confidence: "unconfirmed",
      note: "Expected but not announced. The first two editions were held in August 2025 and August 2026, and a governing body — the World Humanoid Robot Sports Federation — was created after the first. A third edition is an inference from that pattern, not a published date.",
    },
    {
      slug: "cmg-2026-finals",
      competitionId: C("cmg-2026"),
      name: "CMG2026 Championship Finale",
      country: "CN",
      startsAt: D("2026-12-31T00:00:00Z"),
      startTimeTbd: true,
      dateTbd: true,
      dateLabel: "Date unpublished",
      timezone: "Asia/Shanghai",
      status: "scheduled",
      confidence: "unconfirmed",
      note: "Stage three of three, described as full-size autonomous combat. Neither the date nor the venue has been published as of September 2026.",
    },

    /* ---- CyberHero's announced world circuit: six stops, no cities ----- */
    ...([
      ["middle-east-1", "Middle East", "First announced Middle East stop after Riyadh."],
      ["middle-east-2", "Middle East", "Second announced Middle East stop."],
      ["europe", "Europe", "The announced European stop."],
      ["americas", "Americas", "The announced Americas stop."],
      ["asia", "Asia", "The announced Asian stop."],
      ["unspecified", "Region unspecified", "The eighth city in the announced eight-city season, region not stated."],
    ] as const).map(([key, region, detail]) => ({
      slug: `cyberhero-circuit-${key}`,
      competitionId: C("cyberhero"),
      name: `CyberHero World Circuit — ${region}`,
      startsAt: D("2027-01-01T00:00:00Z"),
      startTimeTbd: true,
      dateTbd: true,
      dateLabel: "City and date unannounced",
      timezone: "UTC",
      status: "scheduled" as const,
      confidence: "unconfirmed" as const,
      note: `${detail} Hero Esports announced an eight-city season across four regions when it launched in Riyadh, and has named neither the cities nor the dates. Six of the eight remain unannounced — this row exists to track that, not to claim a fixture.`,
      sourceUrl:
        "https://www.prnewswire.com/news-releases/hero-esports-to-stage-middle-easts-first-humanoid-robot-kickboxing-event-in-riyadh-302864961.html",
    })),

    /* ---- Backfill: completed --------------------------------------- */
    {
      slug: "world-humanoid-robot-games-2025",
      competitionId: C("world-humanoid-robot-games"),
      name: "World Humanoid Robot Games 2025",
      venue: "National Speed Skating Oval",
      city: "Beijing",
      country: "CN",
      startsAt: D("2025-08-14T00:00:00Z"),
      endsAt: D("2025-08-17T23:59:59Z"),
      startTimeTbd: true,
      timezone: "Asia/Shanghai",
      status: "completed",
      confidence: "confirmed",
      note: "The first edition. 280 teams from 16 countries, around 500 robots, 26 events and 487 matches.",
      resultsSummary: `Kickboxing was a scored contact sport at these Games, and the medallists have never been published anywhere findable.

What is on record is the track: Unitree took 11 medals including four golds — 400 m, 1500 m, 100 m hurdles and the 4×100 m relay — and none of them in kickboxing.

The World Humanoid Robot Sports Federation was created after this edition to govern the next.`,
    },

    /* ---- Exhibitions ------------------------------------------------ */
    {
      slug: "ufc-fight-night-257-shanghai-exhibition",
      competitionId: C("exhibitions"),
      name: "UFC Fight Night 257 — humanoid exhibition",
      city: "Shanghai",
      country: "CN",
      startsAt: D("2025-08-23T00:00:00Z"),
      startTimeTbd: true,
      timezone: "Asia/Shanghai",
      status: "completed",
      kind: "exhibition",
      confidence: "reported",
      note: "A promotional demonstration on a UFC card, not a sanctioned bout.",
      resultsSummary: `Unitree humanoids staged an MMA-style exhibition on the UFC Fight Night 257 card in Shanghai, refereed by UFC president Dana White, who also met Unitree's chief executive Wang Xingxing at the event.

No winner was declared and none should be inferred. This is recorded because it is the closest humanoid fighting has come to a mainstream combat-sports platform, not because anything was decided.`,
    },
    {
      slug: "ces-2026-battlebox-exhibition",
      competitionId: C("ufb"),
      name: "UFB at CES 2026 — inside the BattleBox",
      venue: "BattleBots Arena",
      city: "Las Vegas",
      stateCode: "NV",
      country: "US",
      startsAt: D("2026-01-06T00:00:00Z"),
      startTimeTbd: true,
      timezone: "America/Los_Angeles",
      status: "completed",
      kind: "exhibition",
      confidence: "reported",
      note: "Staged by UFB in partnership with BattleBots. An exhibition, not a Season 1 fixture.",
      resultsSummary: `UFB put two Unitree G1s in a boxing-style bout inside the BattleBots BattleBox at CES in Las Vegas, with human pilots at ringside and a human referee.

No result has been published. Boston Dynamics staff attended as spectators and an Atlas was on the show floor, but it did not fight.`,
      sourceUrl:
        "https://interestingengineering.com/ai-robotics/humanoid-robots-fight-ces-2026",
    },
    {
      slug: "unitree-h2-g1-sparring-2025",
      competitionId: C("exhibitions"),
      name: "Unitree H2 vs G1 sparring video",
      country: "CN",
      startsAt: D("2025-12-15T00:00:00Z"),
      startTimeTbd: true,
      dateTbd: true,
      dateLabel: "December 2025",
      timezone: "Asia/Shanghai",
      status: "completed",
      kind: "exhibition",
      confidence: "reported",
      note: "A manufacturer's video, not an event anyone attended.",
      resultsSummary: `Unitree published footage of its H2 — about six feet, 70 kg and 31 degrees of freedom — sparring with a G1.

The H2 was driven by a full-body motion-capture suit. This was not autonomy, and the video is frequently cited as though it were.`,
    },
  ];

  for (const e of EVENTS) {
    // The slug is the conflict key, so it is excluded from the update set —
    // updating a row's slug to the value it already has is harmless, but
    // spelling it out here documents that re-running never re-slugs anything.
    const { slug: _slug, ...rest } = e;
    void _slug;
    await db
      .insert(events)
      .values(e)
      .onConflictDoUpdate({ target: events.slug, set: rest });
  }

  // Patch the events that already existed with their new fields.
  await db
    .update(events)
    .set({
      confidence: "confirmed",
      note: "Four Unitree G1s, fully remote-piloted, with movement trained from motion capture of professional kickboxers. Officially the CMG World Robot Contest — Mecha Fighting Series.",
    })
    .where(eq(events.slug, "iron-fist-king-awakening-2025"));

  /*
   * The URKL opener's venue and format only.
   *
   * `results_summary` is deliberately NOT set here. On 12 September 2026 the
   * winner turned out to be disputed -- Wikipedia says Matador took three of
   * five rounds after being decapitated, Newsweek reads as a White Eagle win
   * with no declared decision, and EngineAI has never published a result at all.
   * scripts/fix-urkl-winner.ts owns that prose now, and a re-run of this seed
   * must not quietly re-assert the settled-sounding version it replaced.
   */
  await db
    .update(events)
    .set({
      confidence: "reported",
      venue: "Shenzhen Nanshan Cultural and Sports Center",
      note: "Around 200 teams from 10 countries registered; the top 32 came through online qualifiers, 16 advanced to four groups, and the top two per group went to single elimination. Every team fights an identical EngineAI T800, supplied free.",
    })
    .where(eq(events.slug, "urkl-opening-shenzhen-2026"));

  await db
    .update(events)
    .set({
      confidence: "confirmed",
      endsAt: D("2026-08-26T23:59:59Z"),
      venue: "National Speed Skating Oval",
      note: "666 teams, 2,056 robots, 16 countries, 51 events — 30 competitive and 21 scenario — and 1,301 matches.",
      resultsSummary: `Martial arts was promoted from a demonstration to a scored competitive event at this edition, and the martial arts medallists have not been published.

The rule change that matters most is the Autonomy Weight Coefficient. Sprints, relays, football, tai chi and gymnastics now mandate full autonomy. Kickboxing and the obstacle events still permit teleoperation — but a teleoperated robot scores only half points, which is the first time any body in this sport has put a number on the difference between a machine fighting and a person driving.

AGIBOT topped the medal table with 18 gold, 16 silver and 12 bronze. Tiangong Ultra, built by X-Humanoid, set the headline track records; its 100 m time is reported as 8.86 s by some outlets and 9.39 s by others.`,
    })
    .where(eq(events.slug, "world-humanoid-robot-games-2026"));

  const eventId = new Map(
    (await db.select({ id: events.id, slug: events.slug }).from(events)).map(
      (r) => [r.slug, r.id],
    ),
  );
  const E = (slug: string) => {
    const id = eventId.get(slug);
    if (!id) throw new Error(`No event "${slug}"`);
    return id;
  };

  /* ---------------------------------------------------------------------- */
  /* 7. The Iron Fist King final — a real card, with the pilots on it        */
  /* ---------------------------------------------------------------------- */

  console.log("Bouts…");
  const ifkEvent = E("iron-fist-king-awakening-2025");
  const existing = await db
    .select({ id: bouts.id })
    .from(bouts)
    .where(eq(bouts.eventId, ifkEvent));

  if (existing.length === 0) {
    const [final] = await db
      .insert(bouts)
      .values({
        eventId: ifkEvent,
        competitionId: C("iron-fist-king"),
        orderIndex: 1,
        robotAId: R("ai-strategist-g1"),
        robotBId: R("energy-guardian-g1"),
        teamAId: T("ai-strategist"),
        teamBId: T("energy-guardian"),
        pilotAId: P("lu-xin"),
        pilotBId: P("hu-yunqian"),
        scheduledRounds: 3,
        status: "completed",
      })
      .returning({ id: bouts.id });

    await db.insert(boutResults).values({
      boutId: final.id,
      winnerRobotId: R("ai-strategist-g1"),
      method: "decision",
      endRound: 3,
      // Three rounds of two minutes. The knockdown count is the reported
      // detail -- Energy Guardian is described as having gone down in all
      // three -- and it is why this is `reported` rather than `confirmed`.
      knockdownsB: 3,
      confidence: "reported",
      notes:
        "Scoring was 1 point for an arm strike, 3 for a leg strike to the head or body, −5 for a knockdown, and −10 with the round ended if a robot could not stand within 8 seconds. Broadcast on CCTV-10, CCTV News, CCTV Video, CCTV Sports and CGTN with a global live stream.",
      recordedAt: D("2025-05-25T14:00:00Z"),
    });
  }

  /*
   * The URKL opener's result is NOT marked confirmed, and that is the whole
   * point. It was, until checking it against three sources produced three
   * answers and the promoter turned out never to have published one.
   * scripts/fix-urkl-winner.ts sets it to `unconfirmed` and explains why; this
   * seed leaves it alone so a re-run cannot silently launder it back.
   */

  /* ---------------------------------------------------------------------- */
  /* 8. Where to watch                                                       */
  /* ---------------------------------------------------------------------- */

  /*
   * Watch channels are NOT seeded here any more.
   *
   * scripts/seed-watch-channels.ts owns them, because every row on that page
   * has to carry a working link and the links have to be fetched and checked
   * before they are written. That is a different job from seeding facts, and
   * mixing the two meant a re-run of this file could silently replace verified
   * URLs with the linkless rows it used to write.
   */

  /* ---------------------------------------------------------------------- */
  /* 9. How to enter                                                         */
  /* ---------------------------------------------------------------------- */

  console.log("Entry routes…");
  await db.delete(entryRoutes);
  await db.insert(entryRoutes).values([
    {
      competitionId: C("ufb"),
      role: "Pilot",
      howToEnter:
        "Create an account. Signing up IS the registration — there is no separate application. Pilots drive the humanoids in the arena; the league is explicitly recruiting gamers, athletes and performers rather than engineers.",
      url: "https://account.ultimatebots.com/signup",
      hardwareProvided: true,
      hardwareNote:
        "Every team is assigned a Unitree G1 by the league. No robot purchase is required.",
      prize: "$100,000 prize pool across Season 2.",
      deadline: "None published.",
      barriers:
        "Season 2 runs 1 October 2026 to 31 March 2027 and events are in San Francisco, so this is realistically for people who can get to the Bay Area — though UFB also supports browser-based remote piloting, which is the only route in this sport that does not require being in the room.",
      orderIndex: 0,
      confidence: "confirmed",
      sourceUrl: "https://ultimatebots.com",
    },
    {
      competitionId: C("ufb"),
      role: "Ghost (engineering)",
      howToEnter:
        "Same signup, different role. A Ghost works the Physical AI stack behind the robot rather than driving it.",
      url: "https://account.ultimatebots.com/signup",
      hardwareProvided: true,
      hardwareNote: "League-assigned Unitree G1.",
      prize: "Shares the $100,000 Season 2 pool.",
      deadline: "None published.",
      orderIndex: 1,
      confidence: "confirmed",
      sourceUrl: "https://ultimatebots.com",
    },
    {
      competitionId: C("urkl"),
      role: "Competing team",
      howToEnter:
        "Email the league. Around 200 teams from 10 countries entered the first season, with the top 32 decided by online qualifiers — so the entry route does not require being in China, though the fighting does.",
      contact: "URKL@engineai.com.cn",
      url: "https://en.engineai.com.cn",
      hardwareProvided: true,
      hardwareNote:
        "Every team receives an identical EngineAI T800 free of charge. The top 16 keep theirs; the top 8 also receive limited-edition robots and priority recruitment.",
      prize:
        "A 10 kg solid gold belt worth roughly RMB 10 million (about US$1.44 million). The top four also take cash.",
      deadline: "Not published for the current season.",
      barriers:
        "Events are in China, with the grand final in Dubai. Algorithm changes must be approved in advance and dangerous modifications are banned.",
      orderIndex: 0,
      confidence: "confirmed",
      sourceUrl: "https://en.engineai.com.cn",
    },
    {
      competitionId: C("cmg-2026"),
      role: "Individual operator — no robot",
      howToEnter:
        "Register through the 央视科教 (CCTV Science & Education) WeChat official account using the keyword 报名. Individual operators compete by remote, voice or motion-sensing control, using machines they do not own.",
      contact: "WeChat: 央视科教, keyword 报名",
      hardwareProvided: true,
      hardwareNote:
        "No robot of your own is required for this route — that is the point of it.",
      deadline: "Global recruitment opened 11 June 2026. No closing date published.",
      barriers:
        "There is no English-language portal. Registration runs through a Chinese social platform and a Chinese-language keyword, which in practice means this route is open to anyone who can read Chinese and closed to almost everyone who cannot.",
      orderIndex: 0,
      confidence: "reported",
    },
    {
      competitionId: C("cmg-2026"),
      role: "Robot company or developer group",
      howToEnter:
        "The other of the two announced routes: bring your own humanoid. Same WeChat registration.",
      contact: "WeChat: 央视科教, keyword 报名",
      hardwareProvided: false,
      hardwareNote: "You supply the machine. The headline platform is the Unitree H2.",
      deadline: "No closing date published.",
      barriers: "No English-language portal.",
      orderIndex: 1,
      confidence: "reported",
    },
    {
      competitionId: C("cyberhero"),
      role: "Team — builders, coders, drivers",
      howToEnter:
        "Hero Esports handles team entry through partnerships rather than an open signup, so this is an approach rather than a registration.",
      contact: "partnership@heroesports.com",
      hardwareProvided: false,
      deadline: "None published.",
      barriers:
        "No public entry portal exists. Six of the eight announced circuit cities have not been named, so there is no way to know where you would be competing.",
      orderIndex: 0,
      confidence: "reported",
    },
  ]);

  /* ---------------------------------------------------------------------- */
  /* 10. Open questions                                                      */
  /* ---------------------------------------------------------------------- */

  console.log("Open questions…");
  const QUESTIONS = [
    {
      slug: "whrg-2025-kickboxing-medallists",
      question:
        "Who won kickboxing at the 2025 World Humanoid Robot Games?",
      detail:
        "Kickboxing was a scored contact sport at the first Games in Beijing in August 2025 — 280 teams, 26 events, 487 matches. The medallists have never been published anywhere findable, in English or in Chinese. Unitree's 11 medals and 4 golds are all on record and all on the track; what happened in the ring is not.",
      competitionId: C("world-humanoid-robot-games"),
      eventId: E("world-humanoid-robot-games-2025"),
      orderIndex: 0,
    },
    {
      slug: "whrg-2026-martial-arts-medallists",
      question:
        "Who won martial arts at the 2026 World Humanoid Robot Games?",
      detail:
        "Martial arts was promoted from demonstration to scored competition for the second edition, which makes its medallists the most significant unpublished result in the sport. The full medal table by organisation is known — AGIBOT topped it with 18 gold — but the martial arts placings specifically have not been released.",
      competitionId: C("world-humanoid-robot-games"),
      eventId: E("world-humanoid-robot-games-2026"),
      orderIndex: 1,
    },
    {
      slug: "mecha-king-2025-result",
      question: "Who won EngineAI's Mecha King on 24 December 2025?",
      detail:
        "Billed as the first full-size humanoid free-combat championship. EngineAI open-sourced the robot code so teams could train their own fighters, staged the event in Shenzhen, and never published a winner. The same company went on to found URKL, which publishes results — which makes the silence about this one harder to explain, not easier.",
      competitionId: C("engineai-mecha-king"),
      orderIndex: 2,
    },
    {
      slug: "cmg-2026-finals-date",
      question: "When and where is the CMG2026 final?",
      detail:
        "China Media Group announced the competition on 10 June 2026 and opened global recruitment the next day. Three stages were described, ending in a championship finale of full-size autonomous combat. As of September 2026 neither the date nor the venue has been published — which also means nobody entering can know what they are entering.",
      competitionId: C("cmg-2026"),
      eventId: E("cmg-2026-finals"),
      orderIndex: 3,
    },
    {
      slug: "urkl-autonomy-level",
      question: "How autonomous are URKL's robots, really?",
      detail:
        "Sources conflict. Some describe a semi-autonomous arrangement in which a human operator supplies intent and onboard AI executes the movement; others describe full autonomy with no human in the loop. Both cannot be true, and the answer decides what the sport is: a league of algorithms, or a league of drivers. The 2026 World Humanoid Robot Games took the question seriously enough to halve the points of any teleoperated robot.",
      competitionId: C("urkl"),
      eventId: E("urkl-opening-shenzhen-2026"),
      orderIndex: 4,
    },
    {
      slug: "tiangong-ultra-100m-record",
      question: "Did Tiangong Ultra run 100 m in 8.86 s or 9.39 s?",
      detail:
        "X-Humanoid's Tiangong Ultra set the headline track records at the 2026 World Humanoid Robot Games, and the 100 m time is reported as both 8.86 seconds and 9.39 seconds across sources. Half a second is the difference between beating Usain Bolt's world record and not.",
      competitionId: C("world-humanoid-robot-games"),
      eventId: E("world-humanoid-robot-games-2026"),
      orderIndex: 5,
    },
    {
      slug: "cyberhero-circuit-cities",
      question: "Which six cities does CyberHero's world circuit visit?",
      detail:
        "Hero Esports announced an eight-city season across four regions — two Middle East, one Europe, one Americas, one Asia and one more — at the Riyadh launch on 9 September 2026. Riyadh is one. The other cities have not been named and no dates have been published. Six announced fixtures with no location is a fact worth tracking, and nobody else is tracking it.",
      competitionId: C("cyberhero"),
      orderIndex: 6,
    },
    {
      slug: "unitree-unifolm-autonomy-claim",
      question:
        "Has anyone independently verified Unitree's autonomous combat claim?",
      detail:
        "Unitree announced UnifoLM-X2-1.0 on 7 September 2026, claiming the first fully autonomous high-dynamic humanoid combat — no teleoperation, no choreography. Its predecessor UnifoLM-WMA-0 was open-sourced in September 2025. The claim is the manufacturer's own and has not been independently verified. UC Berkeley's Ken Goldberg calls this category of event robot theater: \"Many of them have humans controlling them... Beware of what you see in the videos, it isn't quite real.\"",
      orderIndex: 7,
    },
  ];
  for (const q of QUESTIONS) {
    await db
      .insert(openQuestions)
      .values(q)
      .onConflictDoUpdate({ target: openQuestions.slug, set: q });
  }

  /* ---------------------------------------------------------------------- */
  /* 11. Evergreen explainers                                                */
  /* ---------------------------------------------------------------------- */

  console.log("Marking evergreen explainers…");
  await db
    .update(posts)
    .set({ evergreen: true })
    .where(
      inArray(posts.slug, [
        "five-leagues-explained",
        "urkl-explained",
        "rek-vr-fight-club",
        "iron-fist-king-rewatch",
      ]),
    );

  /* ---------------------------------------------------------------------- */
  /* 12. Retire the manufacturers that were masquerading as teams            */
  /* ---------------------------------------------------------------------- */

  console.log("Retiring manufacturer-teams…");
  const retiring = ["engineai", "unitree-robotics"];
  for (const slug of retiring) {
    const id = teamId.get(slug);
    if (!id) continue;
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(bouts)
      .where(sql`${bouts.teamAId} = ${id} OR ${bouts.teamBId} = ${id}`);
    if (n > 0) {
      console.log(`  ${slug}: ${n} bouts reference it — left in place.`);
      continue;
    }
    const [{ r }] = await db
      .select({ r: sql<number>`count(*)::int` })
      .from(robots)
      .where(eq(robots.teamId, id));
    if (r > 0) {
      console.log(`  ${slug}: ${r} robots still point at it — left in place.`);
      continue;
    }
    await db.delete(teams).where(eq(teams.id, id));
    console.log(`  ${slug}: removed from teams (now a manufacturer).`);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
