import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Shadow Combat League — Malaysia. The league the watcher missed.
 *
 * Tobias found this by hand on 19 September 2026. The sweep had never seen it:
 * 569 swept rows searched for %shadow% and %malay% returned four irrelevant
 * hits. The net has since been widened (see lib/signals.ts); this file is the
 * other half of that repair — putting the league itself into the record.
 *
 * HOW THE FACTS BELOW ARE SOURCED, because they are not sourced equally and
 * the rows say so rather than flattening it:
 *
 *   BERNAMA (bernama.com, 14 Sep 2026) — Malaysia's national news agency.
 *   The strongest source here. Everything about New Dawn MY comes from it:
 *   the date, the venue, the card structure, the three title divisions and
 *   the named participants. Marked `confirmed`.
 *
 *   SCL's own press release (EIN Presswire, 19 May 2026) — first-party and
 *   promotional. Good for what the league says about itself: the First Light
 *   date and time, the streaming platforms, two executives, four pilots.
 *   Marked `confirmed` for the plain facts of its own event, because an
 *   organiser announcing its own broadcast is the primary source for it.
 *
 *   RoboSports Global (robosportsglobal.com) — an aggregator of unknown
 *   editorial standard, and the ONLY source for the most interesting claims:
 *   the First Light bout results, the Unitree G1 platform, the round format,
 *   and a token with betting attached. Nothing from it is written here as a
 *   fact. It becomes `unconfirmed` prose or an open question, never a result
 *   row.
 *
 * WHY THERE ARE NO BOUT ROWS.
 * ---------------------------
 * A `bouts` row requires two robots by name. SCL has published pilot names but
 * not machine names — the robots are collectively "Shadows". Creating bout rows
 * would mean inventing two robot identities per fight and then recording a
 * winner against one of them. That is precisely the fabrication this schema's
 * confidence column exists to prevent, so First Light's reported results live
 * in an open question instead, where they can be checked against the VOD and
 * promoted if they hold up.
 *
 * Idempotent: every write is an upsert keyed on a slug.
 *
 * Usage: npm run db:seed-scl
 */

const BERNAMA = "https://www.bernama.com/en/sports/news.php?id=2607139";
const PRESS_RELEASE =
  "https://www.einpresswire.com/article/913479441/robotic-combat-sports-the-next-evolution-of-entertainment-sports-launched-in-malaysia-by-local-startup";
const ROBOSPORTS = "https://robosportsglobal.com/shadow-combat-league/";

async function main() {
  const { db } = await import("../src/db");
  const {
    competitions,
    entryRoutes,
    events,
    openQuestions,
    pilots,
    watchChannels,
  } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  /* ---------------------------------------------------------------------- */
  /* 1. The league                                                           */
  /* ---------------------------------------------------------------------- */

  const league = {
    slug: "shadow-combat-league",
    name: "Shadow Combat League",
    organizer: "Shadow Combat League (SCL)",
    seasonYear: 2026,
    status: "active" as const,
    class: "humanoid" as const,
    country: "MY",
    city: "Kuala Lumpur",
    foundedYear: 2026,
    websiteUrl: "https://shadowcombatleague.com",
    sourceUrl: BERNAMA,
    confidence: "confirmed" as const,
    description: `Shadow Combat League is a Malaysian promotion staging bouts between bipedal humanoid robots driven in real time by human pilots wearing motion capture. The machines are called Shadows, and the name is the format: a pilot moves, the robot mirrors it one-to-one, and the fight is between two people expressed through two machines.

That makes SCL a different thing from most of this record. URKL and CyberHero are increasingly autonomous; the World Humanoid Robot Games scores machines. SCL is explicitly teleoperated and explicitly entertainment — it calls itself Southeast Asia's first live teleoperated humanoid combat league, and the claim is worth attributing rather than repeating, because "first" in this sport has been claimed by four organisations on three continents.

The league was founded in 2026 and is based in Ipoh, Perak, with its events in Kuala Lumpur. Dr Ian Tan Wei Lun is named as founder by BERNAMA; Joseph Saw is Chief Technology Officer and Peter Davis Chief Content Officer per the league's own announcement. It placed second at the Base Batches 003 hackathon in Johor Bahru.

The inaugural event, First Light: The Dawn of Robotic Combat, was streamed from Kuala Lumpur at 9am Malaysian time on 23 May 2026. The second, New Dawn MY, is a ticketed arena show at Pavilion Damansara Heights on 3 October 2026 — seven bouts across three hours, four preliminaries and three championship fights, contested for three titles split by who the pilot is rather than by weight: ICON for celebrities and entertainers, GLADIATOR for fighters and martial artists, NETRUNNER for technologists, gamers and corporate entrants.

Two things about this league are recorded here as open questions rather than as facts, and both are on /open-questions. The bout format appears to have changed between the two events and no source states that it did. And a single uncorroborated source describes an SCL token carrying event access, governance and betting — a claim this site will not repeat until a first-party source states it.`,
  };

  await db
    .insert(competitions)
    .values(league)
    .onConflictDoUpdate({ target: competitions.slug, set: league });

  const leagueId = (
    await db
      .select({ id: competitions.id })
      .from(competitions)
      .where(eq(competitions.slug, league.slug))
  )[0].id;

  /* ---------------------------------------------------------------------- */
  /* 2. Events                                                               */
  /* ---------------------------------------------------------------------- */

  const EVENTS = [
    {
      slug: "scl-first-light-2026",
      competitionId: leagueId,
      name: "First Light: The Dawn of Robotic Combat",
      venue: null,
      city: "Kuala Lumpur",
      country: "MY",
      /*
       * 9am GMT+8, stated in the league's own release. One of the few events
       * in this record with a published clock time rather than a date alone,
       * so startTimeTbd stays false.
       */
      startsAt: new Date("2026-05-23T01:00:00Z"),
      startTimeTbd: false,
      timezone: "Asia/Kuala_Lumpur",
      status: "completed" as const,
      kind: "competition" as const,
      access: "free" as const,
      confidence: "confirmed" as const,
      sourceUrl: PRESS_RELEASE,
      note: "Streamed, not ticketed. Three bouts were announced; the results circulating for them rest on one uncorroborated source and are tracked on /open-questions rather than recorded here.",
    },
    {
      slug: "scl-new-dawn-my-2026",
      competitionId: leagueId,
      name: "New Dawn MY",
      venue: "Pavilion Arena, Pavilion Damansara Heights",
      city: "Kuala Lumpur",
      country: "MY",
      /*
       * BERNAMA gives the date and no clock. startsAt carries an instant
       * because the calendar needs one to sort; startTimeTbd is what stops the
       * page printing it as though the league had announced 8pm.
       */
      startsAt: new Date("2026-10-03T12:00:00Z"),
      startTimeTbd: true,
      timezone: "Asia/Kuala_Lumpur",
      status: "scheduled" as const,
      kind: "competition" as const,
      access: "free" as const,
      confidence: "confirmed" as const,
      sourceUrl: BERNAMA,
      note: "Seven bouts across three hours: four preliminaries and three main-card championship bouts for the ICON, GLADIATOR and NETRUNNER titles. A bout runs up to 15 minutes, or until a machine stops getting back up. No start time and no broadcast arrangement announced.",
    },
  ];

  for (const e of EVENTS) {
    await db
      .insert(events)
      .values(e)
      .onConflictDoUpdate({ target: events.slug, set: e });
  }

  const eventId = new Map(
    (await db.select({ id: events.id, slug: events.slug }).from(events)).map(
      (r) => [r.slug, r.id],
    ),
  );

  /* ---------------------------------------------------------------------- */
  /* 3. People                                                               */
  /* ---------------------------------------------------------------------- */

  /*
   * Named in sources, nothing inferred. Where a source gives a record or a
   * title it is repeated with its source; where it gives only a name, the row
   * carries only a name. Several of these are well-known people in Malaysia
   * and none of the prose below goes past what the two sources state.
   */
  const PEOPLE = [
    {
      slug: "ian-tan-wei-lun",
      name: "Dr Ian Tan Wei Lun",
      role: "founder" as const,
      nationality: "MY",
      competitionId: leagueId,
      affiliation: "Founder, Shadow Combat League",
      notableResult: "Founded Shadow Combat League, 2026",
      sourceUrl: BERNAMA,
      confidence: "confirmed" as const,
    },
    {
      slug: "joseph-saw",
      name: "Joseph Saw",
      role: "executive" as const,
      nationality: "MY",
      competitionId: leagueId,
      affiliation: "Chief Technology Officer, Shadow Combat League",
      sourceUrl: PRESS_RELEASE,
      confidence: "confirmed" as const,
    },
    {
      slug: "peter-davis-scl",
      name: "Peter Davis",
      role: "executive" as const,
      competitionId: leagueId,
      affiliation: "Chief Content Officer, Shadow Combat League",
      notableResult: "Ring announcer at First Light, May 2026",
      sourceUrl: PRESS_RELEASE,
      confidence: "confirmed" as const,
    },
    {
      slug: "aiman-abu-bakar",
      name: "Aiman Abu Bakar",
      role: "pilot" as const,
      nationality: "MY",
      competitionId: leagueId,
      notableResult:
        "WBC Asia Super Featherweight champion; piloted at First Light",
      bio: "Reigning World Boxing Council Asia Super Featherweight champion, named by SCL as a pilot for First Light in May 2026. A record of 13 wins, 7 by knockout, 2 losses and 1 draw is reported by a single uncorroborated source and is not treated as settled here.",
      sourceUrl: PRESS_RELEASE,
      confidence: "confirmed" as const,
    },
    {
      slug: "isaac-quinn-lee",
      name: "Isaac Quinn Lee",
      role: "pilot" as const,
      competitionId: leagueId,
      notableResult: "Professional Muay Thai fighter; piloted at First Light",
      sourceUrl: PRESS_RELEASE,
      confidence: "confirmed" as const,
    },
    {
      slug: "bibian-leong",
      name: "Bibian Leong",
      role: "pilot" as const,
      competitionId: leagueId,
      notableResult: "Piloted at First Light, May 2026",
      sourceUrl: PRESS_RELEASE,
      confidence: "confirmed" as const,
    },
    {
      slug: "papizak",
      name: "PapiZak",
      role: "pilot" as const,
      competitionId: leagueId,
      notableResult: "Piloted at First Light, May 2026",
      sourceUrl: PRESS_RELEASE,
      confidence: "confirmed" as const,
    },
    {
      slug: "safee-sali",
      name: "Safee Sali",
      role: "pilot" as const,
      nationality: "MY",
      competitionId: leagueId,
      notableResult:
        "Former Malaysia international footballer; announced for New Dawn MY",
      sourceUrl: BERNAMA,
      confidence: "confirmed" as const,
    },
    {
      slug: "koo-kien-keat",
      name: "Koo Kien Keat",
      role: "pilot" as const,
      nationality: "MY",
      competitionId: leagueId,
      notableResult:
        "Former badminton doubles player; announced for New Dawn MY",
      sourceUrl: BERNAMA,
      confidence: "confirmed" as const,
    },
    {
      slug: "daniella-sya",
      name: "Daniella Sya",
      role: "pilot" as const,
      nationality: "MY",
      competitionId: leagueId,
      notableResult: "Actress; announced for New Dawn MY",
      sourceUrl: BERNAMA,
      confidence: "confirmed" as const,
    },
    {
      slug: "daniel-fung",
      name: "Daniel Fung",
      role: "pilot" as const,
      nationality: "MY",
      competitionId: leagueId,
      notableResult: "Actor; announced for New Dawn MY",
      sourceUrl: BERNAMA,
      confidence: "confirmed" as const,
    },
    {
      slug: "abdu-rozik",
      name: "Abdu Rozik",
      role: "pilot" as const,
      nationality: "TJ",
      competitionId: leagueId,
      notableResult:
        "Tajikistani singer and social media figure; announced for New Dawn MY",
      sourceUrl: BERNAMA,
      confidence: "confirmed" as const,
    },
    {
      slug: "alan-leu",
      name: "Alan Leu",
      role: "referee" as const,
      competitionId: leagueId,
      notableResult: "Refereed all three bouts at First Light",
      sourceUrl: ROBOSPORTS,
      confidence: "unconfirmed" as const,
    },
  ];

  for (const p of PEOPLE) {
    await db
      .insert(pilots)
      .values(p)
      .onConflictDoUpdate({ target: pilots.slug, set: p });
  }

  /* ---------------------------------------------------------------------- */
  /* 4. Where to watch                                                       */
  /* ---------------------------------------------------------------------- */

  const CHANNELS = [
    {
      competitionId: leagueId,
      name: "@shadowcleague on X",
      url: "https://x.com/shadowcleague",
      region: "Worldwide",
      availability: "link_only" as const,
      note: "The league's own account and the fastest place its announcements appear.",
      orderIndex: 1,
      sourceUrl: PRESS_RELEASE,
      confidence: "confirmed" as const,
    },
    {
      competitionId: leagueId,
      name: "Kick",
      region: "Worldwide",
      availability: "link_only" as const,
      note: "Carried First Light in May 2026. No channel URL published; no arrangement announced for New Dawn MY.",
      orderIndex: 2,
      sourceUrl: PRESS_RELEASE,
      confidence: "reported" as const,
    },
    {
      competitionId: leagueId,
      name: "YouTube",
      region: "Worldwide",
      availability: "link_only" as const,
      note: "Named as a First Light platform in the league's own release. No channel URL published.",
      orderIndex: 3,
      sourceUrl: PRESS_RELEASE,
      confidence: "reported" as const,
    },
    {
      competitionId: leagueId,
      name: "shadowcombatleague.com",
      url: "https://shadowcombatleague.com",
      region: "Worldwide",
      availability: "link_only" as const,
      note: "As of 19 September 2026 the site renders a New Dawn holding page and publishes no schedule, rules or results.",
      orderIndex: 4,
      sourceUrl: PRESS_RELEASE,
      confidence: "confirmed" as const,
    },
  ];

  await db
    .delete(watchChannels)
    .where(eq(watchChannels.competitionId, leagueId));
  for (const c of CHANNELS) {
    await db.insert(watchChannels).values(c);
  }

  /* ---------------------------------------------------------------------- */
  /* 5. How to get in the ring                                               */
  /* ---------------------------------------------------------------------- */

  /*
   * The honest answer is "there is no published route", and that is worth a row
   * rather than an omission — SCL is the only league in this record whose
   * divisions are defined by WHO the pilot is rather than by the machine, which
   * makes "can I enter?" a question a reader will actually ask.
   */
  const ROUTE = {
    competitionId: leagueId,
    role: "Pilot (ICON, GLADIATOR or NETRUNNER)",
    howToEnter:
      "No open entry route has been published. SCL's three divisions are defined by who the pilot is — ICON for celebrities and entertainers, GLADIATOR for fighters and martial artists, NETRUNNER for technologists, gamers and corporate entrants — and every pilot named so far was announced by the league rather than recruited in public. The only published contact is the league's X account and its own site.",
    url: "https://x.com/shadowcleague",
    hardwareProvided: true,
    hardwareNote:
      "The league supplies the machine: pilots wear motion capture and drive an SCL Shadow. No pilot brings a robot. Which platform the Shadows are built on is not stated by any first-party source — see /open-questions.",
    prize: null,
    deadline: null,
    barriers:
      "Events are in Kuala Lumpur and every announced pilot so far is either Malaysia-based or flown in by the league. No application form, no trials, no published criteria.",
    orderIndex: 1,
    sourceUrl: BERNAMA,
    confidence: "unconfirmed" as const,
  };

  await db.delete(entryRoutes).where(eq(entryRoutes.competitionId, leagueId));
  await db.insert(entryRoutes).values(ROUTE);

  /* ---------------------------------------------------------------------- */
  /* 6. What is not known                                                    */
  /* ---------------------------------------------------------------------- */

  const QUESTIONS = [
    {
      slug: "scl-first-light-results",
      question: "Who actually won the three bouts at SCL's First Light?",
      detail:
        "SCL announced First Light for 23 May 2026 and streamed it on X, Kick and YouTube. Results are circulating — Elelliana Affendiva by knockout in round two, Isaac Quinn Lee by unanimous decision, and Bibian by medical stoppage — but they rest on a single aggregator with no established editorial record, and the league has published no result sheet of its own. No bout rows were created here: the machines are unnamed, so recording a winner would mean inventing the robot it was recorded against. The stream exists, which makes this checkable rather than merely open.",
      competitionId: leagueId,
      eventId: eventId.get("scl-first-light-2026") ?? null,
      sourceUrl: ROBOSPORTS,
      orderIndex: 1,
    },
    {
      slug: "scl-format-changed",
      question:
        "Did SCL change its bout format between First Light and New Dawn?",
      detail:
        "First Light is described as three rounds of three minutes with a health-bar scoring system — 50 points for a head strike, 25 for a body strike — resolved by knockout, technical knockout or points. BERNAMA describes New Dawn MY as bouts of up to 15 minutes, or until a machine stops getting back up. Those are not the same sport. No source states that a change was made, so this is either an undocumented rule change between the league's first and second events or one of the two descriptions is wrong.",
      competitionId: leagueId,
      eventId: eventId.get("scl-new-dawn-my-2026") ?? null,
      sourceUrl: BERNAMA,
      orderIndex: 2,
    },
    {
      slug: "scl-shadow-platform",
      question: "What hardware is an SCL Shadow?",
      detail:
        "One uncorroborated source says the Shadows are built on the Unitree G1 and that an EngineAI T800 was added in July 2026. Neither the league's own release nor BERNAMA names a platform, and SCL's website publishes no specifications. It matters beyond trainspotting: if the Shadows are G1s then SCL is running the same machine as UFB in the United States and the Iron Fist King tournament in China, which makes performance across those three leagues directly comparable for the first time.",
      competitionId: leagueId,
      sourceUrl: ROBOSPORTS,
      orderIndex: 3,
    },
    {
      slug: "scl-token-and-betting",
      question:
        "Does Shadow Combat League operate a token, and does it carry betting?",
      detail:
        "A single uncorroborated source describes an SCL token on Base, built with Virtuals Protocol, granting event access, governance and betting. No first-party SCL source seen here mentions a token at all, and the league's website publishes nothing on it. It is recorded as a question rather than a fact for two reasons: the source is thin, and if it is true it is the most consequential thing about this league for anyone writing about it. This site does not carry wagering and does not intend to; covering a league that does is a separate matter from operating one, but it should be covered knowingly rather than by accident.",
      competitionId: leagueId,
      sourceUrl: ROBOSPORTS,
      orderIndex: 4,
    },
    {
      slug: "scl-new-dawn-broadcast",
      question: "How can New Dawn MY be watched from outside Kuala Lumpur?",
      detail:
        "New Dawn MY is a ticketed arena show at Pavilion Damansara Heights on 3 October 2026. First Light was free and streamed on three platforms; nothing published about New Dawn names a stream, a broadcaster or a ticket price. For a league whose first event was built entirely around a livestream, the absence is conspicuous rather than routine.",
      competitionId: leagueId,
      eventId: eventId.get("scl-new-dawn-my-2026") ?? null,
      sourceUrl: BERNAMA,
      orderIndex: 5,
    },
  ];

  for (const q of QUESTIONS) {
    await db
      .insert(openQuestions)
      .values(q)
      .onConflictDoUpdate({ target: openQuestions.slug, set: q });
  }

  console.log(`Shadow Combat League seeded (competition id ${leagueId}).`);
  console.log(
    `  ${EVENTS.length} events, ${PEOPLE.length} people, ${CHANNELS.length} channels, 1 entry route, ${QUESTIONS.length} open questions.`,
  );
  console.log(
    "  0 bouts — the machines are unnamed. See scl-first-light-results.",
  );
  process.exit(0);
}

main();
