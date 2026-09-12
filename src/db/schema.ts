import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * Roboxing schema.
 *
 * Two rules shape everything below:
 *
 * 1. STANDINGS ARE NEVER STORED. There is no points table, no cached record,
 *    no wins column on `teams`. Every table on the site is derived from
 *    `bout_results` weighted by that competition's `points_rules`. A stored
 *    standing drifts the moment someone corrects a result; a derived one
 *    cannot.
 *
 * 2. ALL TIMESTAMPS ARE UTC (`timestamptz`). The venue's timezone is stored
 *    alongside the event as an IANA name so the UI can render both the
 *    viewer's US time and the venue's local time from the same instant.
 */

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const competitionStatus = pgEnum("competition_status", [
  "upcoming",
  "active",
  "completed",
]);

export const eventStatus = pgEnum("event_status", [
  "scheduled",
  "live",
  "completed",
  "cancelled",
]);

/**
 * How well a fact is sourced. The site's whole claim is to be the record, and
 * a record that cannot say how it knows something is a blog.
 *
 * - `confirmed`   — the promoter said it, or two independent outlets agree
 * - `reported`    — one source, credible, uncorroborated
 * - `unconfirmed` — circulating, or an inference, or the source contradicts
 *                   itself
 *
 * Defaults to `reported` rather than `confirmed`, deliberately. A default that
 * overstates is a default that silently launders every row somebody forgot to
 * label, and the rows people forget to label are exactly the thin ones.
 */
export const confidence = pgEnum("confidence", [
  "confirmed",
  "reported",
  "unconfirmed",
]);

/**
 * What KIND of fighting a competition is.
 *
 * - `humanoid`     — bipedal humanoid robots. The sport this site is about,
 *                    and as of September 2026 the only thing it carries.
 * - `piloted_mech` — a human inside the machine.
 * - `adjacent`     — wheeled//destructive combat.
 *
 * THE SITE IS HUMANOID ONLY. It briefly carried a piloted mech league and a
 * wheeled one, each walled off in its own section and excluded from every
 * standings table, and they were removed — a wall is not the same as a promise
 * kept, and "the record of humanoid robot fighting" has to mean what it says.
 *
 * The other two values survive on purpose, with no rows in them. They are the
 * guard: every page filters on `humanoid`, so a non-humanoid row added by hand
 * or by an importer cannot reach a standings table, where it would produce a
 * machine record in which a 500 kg vehicle with a person inside has a win rate
 * against a 35 kg G1. An unused enum value costs nothing; re-deriving that rule
 * after it is forgotten costs a wrong table.
 */
export const competitionClass = pgEnum("competition_class", [
  "humanoid",
  "piloted_mech",
  "adjacent",
]);

/**
 * Whether an event's outcomes count.
 *
 * An exhibition is a real event that happened and is worth recording — the UFC
 * Shanghai demo refereed by Dana White is a genuine milestone — but it is not a
 * sanctioned bout, usually has no declared winner, and must never reach a
 * standings table.
 */
export const eventKind = pgEnum("event_kind", ["competition", "exhibition"]);

/** What a person did, on a site that until now had no people on it at all. */
export const pilotRole = pgEnum("pilot_role", [
  "pilot",
  "founder",
  "referee",
  "executive",
  "engineer",
]);

export const boutStatus = pgEnum("bout_status", [
  "scheduled",
  "live",
  "completed",
]);

/**
 * How a bout ended.
 *
 * `draw` and `no_contest` both leave `winner_robot_id` null, but they are not
 * interchangeable: a draw is a scored result that awards draw points, a no
 * contest is a bout that did not count and awards nothing. Standings treat
 * them differently, so the schema has to keep them apart.
 */
export const boutMethod = pgEnum("bout_method", [
  "ko",
  "tko",
  "decision",
  "draw",
  "dq",
  "no_contest",
]);

export const streamStatus = pgEnum("stream_status", ["idle", "live", "ended"]);

/**
 * What a post IS, which decides how it is laid out.
 *
 * A `clip` leads with the video and carries a sentence of context; an
 * `article` leads with text. Derivable from whether `embedUrl` is set, and
 * deliberately not derived: a written recap can legitimately carry a video,
 * and inferring the layout from a field's presence means the writer cannot
 * choose.
 */
export const postKind = pgEnum("post_kind", ["clip", "article"]);

export const postStatus = pgEnum("post_status", ["draft", "published"]);

/**
 * What it takes to watch an event.
 *
 * `free` today for everything, because there are no broadcast rights yet and
 * nothing to sell. The entitlement check still runs on every playback request
 * — the switch flips per event when there is something to charge for, and the
 * code that must never be wrong has been exercised for months by then rather
 * than written in the fortnight before the first paid night.
 */
export const eventAccess = pgEnum("event_access", ["free", "subscription"]);

/** How someone came to be entitled. */
export const entitlementKind = pgEnum("entitlement_kind", [
  "subscription",
  /**
   * Not sold today — the model is subscription-only. Present because an
   * irregular calendar tends to produce subscribe-watch-cancel behaviour, and
   * a per-event option is the usual answer. Reserving the value now means
   * adding it later is a new row, not a migration of live billing data.
   */
  "ppv",
  /** Comped access: press, the organizer, the team behind the robot. */
  "complimentary",
]);

/* -------------------------------------------------------------------------- */
/* Competitions                                                                */
/* -------------------------------------------------------------------------- */

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** The rights holder running the league, e.g. "EngineAI". */
  organizer: text("organizer"),
  seasonYear: integer("season_year"),
  status: competitionStatus("status").notNull().default("upcoming"),
  description: text("description"),
  logoUrl: text("logo_url"),
  /**
   * Humanoid, piloted mech or adjacent. Defaults to humanoid because that is
   * what this site is, and because a league whose class nobody set should show
   * up in the main list rather than vanish from it.
   */
  class: competitionClass("class").notNull().default("humanoid"),
  /** ISO 3166-1 alpha-2 of the organizer's base, e.g. "US", "CN". */
  country: text("country"),
  city: text("city"),
  foundedYear: integer("founded_year"),
  /** The league's own site. */
  websiteUrl: text("website_url"),
  /** Where we learned what this page says. */
  sourceUrl: text("source_url"),
  confidence: confidence("confidence").notNull().default("reported"),
  /**
   * False for a container that is not a league.
   *
   * `events.competition_id` is NOT NULL, and some events belong to no league at
   * all: the Shanghai UFC demonstration was Unitree and the UFC, and the H2-vs-G1
   * sparring video was a manufacturer's marketing. Those need somewhere to live
   * that is not a fabricated competition, so they hang off a container row that
   * the leagues index filters out. Making the FK nullable instead would push a
   * null check into every query that renders an event.
   */
  isLeague: boolean("is_league").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Manufacturers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Who BUILDS the machines, which is not who fights.
 *
 * This table exists because the site had Unitree listed as a team, which meant
 * a page on which Unitree appeared to be fighting itself. A maker supplies the
 * platform; a team enters it; a pilot drives it. Three different things that
 * were one table.
 *
 * The distinction is load-bearing for the standings, not cosmetic: URKL hands
 * every team an identical EngineAI T800, so "EngineAI" as a competitor would
 * have a record against itself in every bout of the tournament.
 */
export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** The name in its own script, e.g. "宇树科技". Rendered alongside, never instead. */
  nameLocal: text("name_local"),
  country: text("country"),
  foundedYear: integer("founded_year"),
  websiteUrl: text("website_url"),
  logoUrl: text("logo_url"),
  bio: text("bio"),
  sourceUrl: text("source_url"),
  confidence: confidence("confidence").notNull().default("reported"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Scoring for one competition.
 *
 * Separate from `competitions` so a league with different scoring drops in
 * without a code change — the standings query reads these numbers rather than
 * hard-coding 3-1-0. `koBonusPoints` is added on top of the win points when a
 * bout ends by KO or TKO, which is how combat leagues typically reward finishes.
 */
export const pointsRules = pgTable(
  "points_rules",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .notNull()
      .unique()
      .references(() => competitions.id, { onDelete: "cascade" }),
    winPoints: integer("win_points").notNull().default(3),
    drawPoints: integer("draw_points").notNull().default(1),
    lossPoints: integer("loss_points").notNull().default(0),
    koBonusPoints: integer("ko_bonus_points").notNull().default(1),
  },
  (t) => [
    // Negative scoring is representable without this, and a negative loss
    // value (or a bonus large enough to make a loss outscore a win) produces a
    // table that is nonsense but renders perfectly happily.
    check(
      "points_rules_non_negative",
      sql`${t.winPoints} >= 0 AND ${t.drawPoints} >= 0 AND ${t.lossPoints} >= 0 AND ${t.koBonusPoints} >= 0`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Teams and robots                                                            */
/* -------------------------------------------------------------------------- */

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** ISO 3166-1 alpha-2, e.g. "CN", "US". */
  country: text("country"),
  /** The parent company or institution, where different from the team name. */
  orgName: text("org_name"),
  logoUrl: text("logo_url"),
  bio: text("bio"),
  foundedYear: integer("founded_year"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const robots = pgTable(
  "robots",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    /**
     * The team that fights it — NULLABLE since the Machines page grew up.
     *
     * It was NOT NULL when every row was a named fighter with an owner. Half
     * this table is now platform models (Unitree H2, Booster T1, the G1 Combat
     * Edition) that no single team owns: URKL issues an identical T800 to all
     * sixteen. Forcing a team onto those rows meant inventing one, and the
     * invented one was the manufacturer — which is how Unitree came to look
     * like a competitor.
     *
     * Still `restrict` on delete: removing a team must not silently delete the
     * robots whose bout history the standings are computed from.
     */
    teamId: integer("team_id").references(() => teams.id, {
      onDelete: "restrict",
    }),
    /** Who built it. A platform row has this and no team. */
    manufacturerId: integer("manufacturer_id").references(
      () => manufacturers.id,
      { onDelete: "restrict" },
    ),
    name: text("name").notNull(),
    /** Manufacturer model, e.g. "PM01". Distinct from the fighting name. */
    model: text("model"),
    /** Free text rather than an enum — we do not yet know the league's classes. */
    weightClass: text("weight_class"),
    photoUrl: text("photo_url"),
    heightCm: integer("height_cm"),
    /** Grams, so a 62.5 kg robot does not need a float. */
    weightGrams: integer("weight_grams"),
    specsJson: jsonb("specs_json"),
    bio: text("bio"),
    /** Degrees of freedom — the spec sheet number buyers actually compare. */
    degreesOfFreedom: integer("degrees_of_freedom"),
    /**
     * Whole US dollars, not cents.
     *
     * These are list prices in the hundreds of thousands quoted in press
     * releases and converted from RMB at whatever rate the outlet used. Storing
     * cents would imply a precision that the source does not have.
     */
    priceUsd: integer("price_usd"),
    /** "¥3.9M, converted at the September 2026 rate" — the caveat on the number. */
    priceNote: text("price_note"),
    /** Where a reader can actually buy one. */
    purchaseUrl: text("purchase_url"),
    /**
     * Whether an American can get one, in prose.
     *
     * Prose and not a boolean because the real answer is never yes or no: the
     * FCC's July 2026 Covered List notice grandfathers existing authorizations
     * while catching future models, so the honest answer for most machines is a
     * sentence about which units and when.
     */
    usAvailability: text("us_availability"),
    /**
     * Humanoid or piloted mech. A 2.7 m, 500 kg vehicle with a person inside
     * belongs on the Machines page and must never share a comparison table with
     * a 35 kg G1.
     */
    class: competitionClass("class").notNull().default("humanoid"),
    sourceUrl: text("source_url"),
    confidence: confidence("confidence").notNull().default("reported"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("robots_team_id_idx").on(t.teamId),
    index("robots_manufacturer_id_idx").on(t.manufacturerId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Pilots                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The humans.
 *
 * The site had none, which for a sport whose entire appeal is that a person is
 * driving was the largest hole in it. Almost every bout on this site was
 * remote-piloted by a named individual, and until now the record said the
 * robots did it themselves.
 *
 * `role` is wider than "pilot" because the people who matter are not only the
 * ones holding a controller: a league founder, and the UFC president who
 * refereed a humanoid exhibition in Shanghai, both belong in the same index.
 */
export const pilots = pgTable("pilots", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** The name in its own script, e.g. "陆鑫". Rendered alongside, never instead. */
  nameLocal: text("name_local"),
  role: pilotRole("role").notNull().default("pilot"),
  /** ISO 3166-1 alpha-2. */
  nationality: text("nationality"),
  /** The league they are associated with, when there is exactly one. */
  competitionId: integer("competition_id").references(() => competitions.id, {
    onDelete: "set null",
  }),
  /** Job title or affiliation in prose — "CTO, REK" — where a league link is too blunt. */
  affiliation: text("affiliation"),
  photoUrl: text("photo_url"),
  bio: text("bio"),
  /**
   * What they are known for, in one line, for the index page.
   *
   * Stored rather than derived from bouts: the people who matter most to this
   * sport's story mostly have no bout rows at all, and a person whose
   * achievement only exists as prose still belongs in the index.
   */
  notableResult: text("notable_result"),
  sourceUrl: text("source_url"),
  confidence: confidence("confidence").notNull().default("reported"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    venue: text("venue"),
    city: text("city"),
    country: text("country"),
    /**
     * State or territory — US only.
     *
     * Nullable and left null for every other country, because it is a question
     * with no correct answer outside the United States. "Madison Square Garden,
     * NYC" reads as a place; "Madison Square Garden, NYC, NY" is how an
     * American expects a venue written, and the difference matters on a site
     * whose audience is American by design.
     */
    stateCode: text("state_code"),
    /** UTC instant the broadcast starts. */
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    /**
     * True when the organizer announced a DATE but no time.
     *
     * `startsAt` still carries an instant, because ordering the calendar needs
     * one and a nullable start time would infect every query that sorts. This
     * flag says the clock part of it is ours, not theirs — so the UI prints the
     * date alone, suppresses the countdown, and the .ics becomes an all-day
     * entry.
     *
     * Not cosmetic. Most events we cover are somebody else's, and they announce
     * "September 9" on Weibo and nothing more. Rendering that as "6:15 PM EDT"
     * invents a fact, and inventing facts is the one thing a system of record
     * cannot survive doing.
     */
    startTimeTbd: boolean("start_time_tbd").notNull().default(false),
    /**
     * True when the DATE itself is ours, not theirs.
     *
     * One step further than `startTimeTbd`, which says the clock is a guess.
     * This says the calendar is: CyberHero has announced a six-stop world
     * circuit and named none of the cities or dates, and URKL's grand final is
     * confirmed for "December or January" in Dubai.
     *
     * `startsAt` still carries an instant — ordering needs one and a nullable
     * start date would infect every query that sorts — but with this set, the
     * UI must print the window ("December 2026 / January 2027"), never the
     * instant. An announced event rendered as a precise date is the same
     * fabrication as a countdown to an unannounced time, and these rows are the
     * ones a reader is most likely to plan around.
     */
    dateTbd: boolean("date_tbd").notNull().default(false),
    /** How the date should read when `dateTbd` is set: "Dec 2026 / Jan 2027". */
    dateLabel: text("date_label"),
    /**
     * The last day, for anything that is not a single night.
     *
     * UFB's Season 2 runs 1 October to 31 March and the World Humanoid Robot
     * Games run over five days. Modelling those as an instant made the schedule
     * claim a season was an evening.
     */
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /**
     * Competition or exhibition.
     *
     * An exhibition happened and is worth recording — the Shanghai UFC demo
     * refereed by Dana White is a real milestone — but nothing in it is a
     * sanctioned result, and the standings query excludes it by this column.
     */
    kind: eventKind("kind").notNull().default("competition"),
    confidence: confidence("confidence").notNull().default("reported"),
    /**
     * The caveat that belongs beside the date.
     *
     * "Six stops announced, cities unnamed." "The promoter's own site shows
     * 2027, believed a typo." These are the most valuable sentences on a
     * schedule page and there was nowhere to put them — a row that renders as a
     * clean date is a row claiming a precision the announcement never had.
     */
    note: text("note"),
    /**
     * IANA timezone of the VENUE, e.g. "Asia/Shanghai". Not the viewer's.
     * Stored so the site can print "8:00 AM ET · 8:00 PM Shenzhen" from one
     * instant without guessing where the event happened.
     */
    timezone: text("timezone").notNull().default("UTC"),
    status: eventStatus("status").notNull().default("scheduled"),
    /**
     * What it takes to watch this one. Defaults to `free` so nothing is
     * accidentally paywalled by omission — a viewer wrongly refused access is
     * a support ticket and a refund, and it happens at the worst moment.
     */
    access: eventAccess("access").notNull().default("free"),
    posterUrl: text("poster_url"),
    /**
     * ISO 3166-1 alpha-2 codes this event may be played in, passed through to
     * Cloudflare Stream. Null means unrestricted.
     *
     * This is a contractual field, not a feature: broadcast rights are almost
     * always territory-limited, so the list comes from the rights agreement.
     */
    allowedCountries: text("allowed_countries").array(),
    /**
     * Where the world actually watches this, when the broadcast is not ours.
     *
     * The site was built on the assumption that an event on it is an event we
     * hold the rights to, and for a long time that will be false for almost
     * everything worth covering. An event with a `broadcastUrl` sends viewers
     * to YouTube, Bilibili or wherever the organizer put it, and never offers
     * a player of our own.
     *
     * Deliberately a single link rather than a table of them. An event
     * simulcast in three places is a real thing and a rare one; a join table
     * for it today buys a case we have not met and complicates every read.
     */
    broadcastUrl: text("broadcast_url"),
    /** Who is showing it — "Hero Esports on YouTube". Rendered on the button. */
    broadcastName: text("broadcast_name"),
    /**
     * Where we learned this event exists.
     *
     * Not displayed as a headline, but present on the page. When the claim is
     * "we are the reliable calendar for this sport", the difference between a
     * date we can attribute and a date we cannot is the whole product, and the
     * moment to record the source is when it is entered — not when someone
     * disputes it.
     */
    sourceUrl: text("source_url"),
    /**
     * The outcome in prose, for a result that is KNOWN but not enterable.
     *
     * A `bouts` row needs two named robots. Real leagues do not always give us
     * that: CyberHero's first event was a team best-of-seven decided 4–3, and
     * the machines were identified by corner colour alone in every account of
     * it. The score, the round count and the method were reported by two
     * newsrooms — so the fact exists and the schema cannot hold it.
     *
     * Before this column the only options were to invent seven robots or to
     * show an empty league page, and the league page won. That reads as "we
     * don't know", which is false and is the worst thing a system of record
     * can say about a result it does know.
     *
     * Not a substitute for a card. When names appear the bouts go in, the
     * standings compute, and this text stays as the note on how the result
     * was first learned.
     */
    resultsSummary: text("results_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("events_competition_id_idx").on(t.competitionId),
    index("events_starts_at_idx").on(t.startsAt),
    index("events_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* Bouts                                                                       */
/* -------------------------------------------------------------------------- */

export const bouts = pgTable(
  "bouts",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /**
     * Denormalised from the event so the standings query can filter by
     * competition without joining through events. Worth the redundancy: it is
     * the single hottest query on the site.
     */
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "restrict" }),
    /** Position on the card. 1 opens the night, highest is the main event. */
    orderIndex: integer("order_index").notNull().default(0),
    robotAId: integer("robot_a_id")
      .notNull()
      .references(() => robots.id, { onDelete: "restrict" }),
    robotBId: integer("robot_b_id")
      .notNull()
      .references(() => robots.id, { onDelete: "restrict" }),
    /**
     * The teams these robots represented IN THIS BOUT, captured when the bout
     * is created and never updated afterwards.
     *
     * This is not redundant with `robots.team_id`. That column is the robot's
     * CURRENT team, and resolving standings through it means a mid-season
     * transfer silently rewrites history: every past result the robot earned
     * would move to its new team the moment the transfer is saved, changing
     * the final table of a season that has already aired. A completed result
     * has to stay attached to the team that actually earned it.
     */
    teamAId: integer("team_a_id")
      .notNull()
      .references(() => teams.id, { onDelete: "restrict" }),
    teamBId: integer("team_b_id")
      .notNull()
      .references(() => teams.id, { onDelete: "restrict" }),
    /**
     * Who was driving each side.
     *
     * Nullable because it is very often not reported: Chinese coverage of a
     * team tournament names the team and not the operator. Where it IS known —
     * the first Iron Fist King final was Lu Xin against Hu Yunqian — leaving it
     * out made the record say two robots fought each other unaided, which is
     * the single most common misconception about this sport.
     */
    pilotAId: integer("pilot_a_id").references(() => pilots.id, {
      onDelete: "set null",
    }),
    pilotBId: integer("pilot_b_id").references(() => pilots.id, {
      onDelete: "set null",
    }),
    scheduledRounds: integer("scheduled_rounds").notNull().default(3),
    status: boutStatus("status").notNull().default("scheduled"),
    startedAt: timestamp("started_at", { withTimezone: true }),
  },
  (t) => [
    index("bouts_event_id_idx").on(t.eventId),
    index("bouts_competition_id_idx").on(t.competitionId),
    // Robot profile and team pages ask "every bout this robot fought", which
    // is a WHERE robot_a_id = ? OR robot_b_id = ? shape. Without these it is a
    // sequential scan over every bout ever staged, getting worse each event.
    index("bouts_robot_a_id_idx").on(t.robotAId),
    index("bouts_robot_b_id_idx").on(t.robotBId),
    // One slot per position on a card, so a drag-reorder in admin cannot
    // produce two "bout 3"s and a nondeterministic running order.
    unique("bouts_event_order_unique").on(t.eventId, t.orderIndex),
    // A robot cannot fight itself. Cheap to enforce, impossible to reason
    // about in the standings if it ever happened.
    check("bouts_distinct_robots", sql`${t.robotAId} <> ${t.robotBId}`),
  ],
);

/**
 * The outcome of a bout.
 *
 * A separate table from `bouts` on purpose: an unresolved bout is the ABSENCE
 * of a row here, not a spread of nullable columns that every query has to
 * defend against. `boutId` is UNIQUE, so submitting the same result twice
 * cannot double-count in the standings.
 */
export const boutResults = pgTable(
  "bout_results",
  {
    id: serial("id").primaryKey(),
    boutId: integer("bout_id")
      .notNull()
      .unique()
      .references(() => bouts.id, { onDelete: "cascade" }),
    /** Null for draw and no_contest. */
    winnerRobotId: integer("winner_robot_id").references(() => robots.id, {
      onDelete: "restrict",
    }),
    method: boutMethod("method").notNull(),
    endRound: integer("end_round"),
    endTimeSeconds: integer("end_time_seconds"),
    knockdownsA: integer("knockdowns_a").notNull().default(0),
    knockdownsB: integer("knockdowns_b").notNull().default(0),
    /**
     * Whatever else the league records — judges' scorecards, damage, strike
     * counts. Deliberately unstructured: we have not seen a real result sheet,
     * and modelling scorecards now would mean inventing a scoring system the
     * league may not use. Fields get promoted to real columns once we know
     * what they actually are.
     */
    statsJson: jsonb("stats_json"),
    notes: text("notes"),
    /**
     * How well the OUTCOME is sourced, which is frequently not as well as the
     * fact that the bout happened.
     *
     * The single most common shape in this sport: a promoter announces a card,
     * the event runs, and the winner reaches the world through one newsroom in
     * a language the promoter does not publish in. That result is real and it
     * is `reported`, not `confirmed`, and a table that renders the two
     * identically is lying by omission.
     */
    confidence: confidence("confidence").notNull().default("reported"),
    /** The report this outcome rests on. */
    sourceUrl: text("source_url"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bout_results_winner_idx").on(t.winnerRobotId),
    // A decisive method must name a winner; a drawn one must not. Without it
    // a mis-click in the admin console stores a "KO" with nobody winning —
    // the standings would drop that bout entirely, so a fight that happened
    // would silently vanish from both teams' records.
    //
    // Note what this CANNOT express: a Postgres CHECK cannot reference another
    // table, so it can't verify the winner is one of THIS bout's two robots.
    // computeStandings() guards that case instead.
    check(
      "bout_results_winner_matches_method",
      sql`(${t.method} IN ('draw','no_contest') AND ${t.winnerRobotId} IS NULL)
          OR (${t.method} NOT IN ('draw','no_contest') AND ${t.winnerRobotId} IS NOT NULL)`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Streams                                                                     */
/* -------------------------------------------------------------------------- */

export const streams = pgTable(
  "streams",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    cfLiveInputId: text("cf_live_input_id"),
    cfPlaybackHlsUrl: text("cf_playback_hls_url"),
    cfRtmpUrl: text("cf_rtmp_url"),
    /**
     * A REFERENCE to the stream key, never the key itself. The actual secret
     * is fetched from Cloudflare on demand and shown once in the admin
     * console — storing it here would put a live broadcast credential in the
     * database and in every backup of it.
     */
    cfStreamKeyRef: text("cf_stream_key_ref"),
    /** The recording Cloudflare produces when the broadcast ends. */
    cfRecordingUid: text("cf_recording_uid"),
    status: streamStatus("status").notNull().default("idle"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("streams_event_id_unique").on(t.eventId)],
);

/* -------------------------------------------------------------------------- */
/* Viewers and access                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A viewer.
 *
 * Clerk owns identity — passwords, social sign-in, sessions, MFA. This table
 * exists only so entitlements have something with a foreign key to hang off,
 * and so a purchase survives independently of the auth provider. If Clerk were
 * ever swapped out, `clerk_user_id` is the only column that would need
 * remapping; who paid for what would be untouched.
 *
 * Email is stored denormalised for the admin UI and for matching against
 * ADMIN_EMAILS. It is refreshed from Clerk on sign-in, because a user can
 * change their email there and this copy would otherwise rot.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    imageUrl: text("image_url"),
    /**
     * Stripe's customer id.
     *
     * Stored so a returning subscriber is billed against the same customer
     * rather than accumulating a new one per checkout — which would scatter
     * their payment methods and invoices across duplicates and make a refund
     * or a cancellation a search operation.
     */
    stripeCustomerId: text("stripe_customer_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [index("users_email_idx").on(t.email)],
);

/**
 * What a viewer is allowed to watch.
 *
 * A row grants access over a time WINDOW rather than merely pointing at a
 * subscription id. That matters for a subscription business: someone who
 * cancels keeps what they already paid for until the period ends, and someone
 * who subscribes after an event does not retroactively gain access to it.
 * Checking "was this entitlement active when the event started" answers both,
 * and a boolean `is_subscribed` on the user answers neither.
 */
export const entitlements = pgTable(
  "entitlements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: entitlementKind("kind").notNull().default("subscription"),
    /** Only set for per-event grants; null means "everything in the window". */
    eventId: integer("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    /** Null means open-ended — used for complimentary access. */
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Stripe's id for the subscription or payment behind this grant. */
    stripeRef: text("stripe_ref"),
    /** Free-text note for complimentary grants: who authorised it, and why. */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("entitlements_user_id_idx").on(t.userId),
    index("entitlements_event_id_idx").on(t.eventId),
    // A window that ends before it starts would silently grant nothing, and
    // the bug would look like "the customer says they paid but cannot watch".
    check(
      "entitlements_window_ordered",
      sql`${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`,
    ),
    // A per-event grant must name an event; a blanket one must not.
    check(
      "entitlements_event_matches_kind",
      sql`(${t.kind} = 'ppv' AND ${t.eventId} IS NOT NULL)
          OR (${t.kind} <> 'ppv')`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Posts                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A piece of published coverage — a clip with context, or a written piece.
 *
 * The site had no way to say anything before this table. It could list what
 * happened and it could not tell you what it meant, which is the difference
 * between a database and a publication, and the publication is the product.
 *
 * Two rules shape it:
 *
 * 1. WE DO NOT HOST THE VIDEO. `embedUrl` points at YouTube, Bilibili or
 *    wherever the organizer put it, and the page embeds their player. Not a
 *    limitation to route around later: re-hosting somebody's footage without
 *    a deal is the one move that ends the relationships this whole strategy
 *    depends on. The embed also has to survive being pointed at an arbitrary
 *    string — see `resolveEmbed()`, which allowlists by host and refuses to
 *    put anything else in an iframe.
 *
 * 2. THE BODY IS PLAIN TEXT, rendered as paragraphs. Not markdown and
 *    certainly not HTML. A rich text field on a public page is an XSS surface
 *    that has to be sanitised correctly forever, in exchange for formatting
 *    that a clip caption does not need. When there is a piece long enough to
 *    want subheadings, that is the moment to add a real renderer — with a
 *    sanitiser and tests — rather than now, on spec.
 */
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    kind: postKind("kind").notNull().default("clip"),
    status: postStatus("status").notNull().default("draft"),
    title: text("title").notNull(),
    /** One line under the headline, and the description search engines get. */
    summary: text("summary"),
    /** Plain text. Blank lines separate paragraphs. */
    body: text("body"),
    /** The clip. Resolved to an iframe only if its host is on the allowlist. */
    embedUrl: text("embed_url"),
    coverImageUrl: text("cover_image_url"),
    /**
     * The event this is about, if it is about one.
     *
     * `set null`, not cascade: deleting an event must not delete the coverage
     * of it. The writing outlives the fixture, and an orphaned post is a post
     * that still reads fine.
     */
    eventId: integer("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    /**
     * True when the morning cron wrote this, not a person.
     *
     * Rendered on the post as a standing disclosure, and that is the entire
     * reason the column exists. An automated brief is written from one fetched
     * source by a model nobody reviewed before it went live; a reader who
     * cannot tell that apart from reported copy has been misled about how much
     * the page is worth trusting. The flag never changes back — an auto brief
     * a human later rewrites should have its body replaced and this cleared
     * deliberately, which is a decision, not a side effect.
     */
    autoPublished: boolean("auto_published").notNull().default(false),
    /**
     * True for an explainer that is not tied to a day.
     *
     * Eight of the first ten posts carry 8 September, because that is when the
     * site was built rather than when anything happened — which reads as a
     * content dump and undersells pieces that are still accurate. Backdating
     * them would be inventing a publication history, so the honest fix is to
     * stop printing a date on the pieces where the date means nothing. The feed
     * still orders by it.
     */
    evergreen: boolean("evergreen").notNull().default(false),
    /** The article the brief was written from. Null for anything hand-written. */
    sourceUrl: text("source_url"),
    /**
     * When it goes live. Null while drafting.
     *
     * A separate gate from `status` so a post can be finished and scheduled —
     * set to published with a future instant and it appears on its own. The
     * public queries check BOTH, which is what makes that work; checking only
     * `status` would publish it the moment it was saved.
     */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The index feed: published, newest first. Both columns, in this order,
    // because that is exactly the WHERE and ORDER BY it runs.
    index("posts_status_published_at_idx").on(t.status, t.publishedAt),
    index("posts_event_id_idx").on(t.eventId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Predictions                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One viewer's call on who wins one bout.
 *
 * Free to play. There is no stake column and there is not going to be one:
 * taking money on these would make this an unlicensed gambling business, which
 * is a US federal matter that no choice of company domicile affects. See the
 * note in STATUS.md.
 *
 * That constraint costs less than it sounds like. What makes a pick worth
 * making is being right in public, and everything that produces — a crowd
 * split before the fight, a running accuracy record, a leaderboard — is here.
 * It also produces the one thing this business genuinely needs right now: a
 * count of people who cared enough about a fight to commit to an opinion
 * before it happened. A pageview cannot say that.
 *
 * Modelled as one row per person per bout, replaced on change rather than
 * appended to. There is no audit interest in a mind changed at 11pm the night
 * before, and keeping the history would mean every read had to find the
 * latest — which is the shape that eventually gets that wrong somewhere.
 */
export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    boutId: integer("bout_id")
      .notNull()
      .references(() => bouts.id, { onDelete: "cascade" }),
    /**
     * The robot they think wins.
     *
     * Must be one of this bout's two, and Postgres cannot say so — a CHECK
     * cannot reference another table. `savePrediction()` verifies it against
     * the bout, exactly as `computeStandings()` has to verify the winner.
     *
     * `restrict`, not cascade: deleting a robot must not silently delete the
     * predictions people made about it and quietly improve their records.
     */
    robotId: integer("robot_id")
      .notNull()
      .references(() => robots.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One pick per person per bout. Without this, a double-submit stores two
    // rows and the crowd split counts one person twice — and if they differ,
    // the person is retroactively right whatever happens.
    unique("predictions_user_bout_unique").on(t.userId, t.boutId),
    // "How did the crowd split on this bout" runs for every bout on a card.
    index("predictions_bout_id_idx").on(t.boutId),
    // "Every pick this person made" powers their record.
    index("predictions_user_id_idx").on(t.userId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Signals                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One item the watcher found: a headline, a video, an announcement.
 *
 * This is the intake side of the editorial pipeline — the "chief of staff"
 * layer Tobias described at the very start. A cron sweeps configured feeds
 * every morning (Google News in English AND Chinese, channel feeds as they
 * are added — see lib/signals.ts) and lands everything here for triage in
 * the admin. Nothing in this table is ever shown to the public: a signal
 * becomes content only by a human decision, or later by the summarise
 * pipeline that writes clearly-attributed briefs.
 *
 * `url` is UNIQUE and is the dedupe key: the same story surfacing on day
 * two must not resurface in the inbox.
 */
export const signals = pgTable(
  "signals",
  {
    id: serial("id").primaryKey(),
    /** Which configured source produced it, e.g. "google-news-zh". */
    source: text("source").notNull(),
    /** Coarse shape: "news" | "video". Text, not an enum — sources will grow. */
    kind: text("kind").notNull().default("news"),
    title: text("title").notNull(),
    url: text("url").notNull().unique(),
    /** The feed's own timestamp, when it carries one. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** "en" | "zh" — which sweep found it, so the inbox can group. */
    language: text("language"),
    /** Triage state: new | kept | dismissed. */
    status: text("status").notNull().default("new"),
    /**
     * The post this signal became, if it became one.
     *
     * `set null` on delete: deleting a bad auto brief must not delete the
     * signal, or the next run finds the same story again and republishes it.
     * The null means "never published", so the column IS the auto-publisher's
     * idempotency guard — and it survives the post being thrown away, which is
     * exactly when a retry would be most unwelcome.
     */
    postId: integer("post_id").references(() => posts.id, {
      onDelete: "set null",
    }),

    /*
     * Stage 2 — what the classifier made of the row. See lib/classify.ts.
     *
     * All four start null, and that is load-bearing rather than incidental:
     * `classified_at IS NULL` IS the work queue. A row the classifier has
     * never seen and a row whose chunk failed mid-run look identical, so the
     * next run picks both up. Nothing needs to record failure separately.
     */
    /** 0–100 relevance. Sorts the inbox. Clamped in code AND checked below. */
    score: integer("score"),
    /** result | event | league | hardware | business | other. */
    category: text("category"),
    /**
     * One sentence, ALWAYS in English, even for a Chinese source. This is the
     * column that pays for the whole stage: the Chinese sweep is this site's
     * edge and it is unreadable to the person doing triage.
     */
    summary: text("summary"),
    classifiedAt: timestamp("classified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The inbox query: new items, newest first.
    index("signals_status_created_idx").on(t.status, t.createdAt),
    // The inbox query after stage 2: new items, best first.
    index("signals_status_score_idx").on(t.status, t.score),
    /*
     * The model is what needs constraining here, not the caller. The code
     * clamps as well; this is the backstop that survives a prompt rewrite or
     * a model swap putting 0–10 or 0–1 in the column instead of 0–100.
     */
    check(
      "signals_score_range",
      sql`${t.score} IS NULL OR (${t.score} >= 0 AND ${t.score} <= 100)`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* Audience                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Someone who asked to hear when something happens.
 *
 * Separate from `users` on purpose, and the separation is the point. A `users`
 * row means an account with Clerk behind it; this table means an email address
 * and consent, nothing more. Almost everyone who cares about this sport in the
 * next year will give an address and never create an account, and forcing a
 * sign-up in front of "tell me when the next one is" would throw away the only
 * demand signal worth having.
 *
 * No mail is sent from here yet — there is no sending provider wired up. The
 * shape assumes one will be:
 *
 * - `confirmedAt` is null until a double opt-in is completed. Nothing reads
 *   this list as "confirmed subscribers" yet, but a list gathered without the
 *   column cannot be retro-confirmed, and single opt-in is not lawful for EU
 *   recipients. Cheaper to have the column and not need it.
 * - `unsubscribeToken` exists from the first row, so the one-click unsubscribe
 *   link in the first mail ever sent resolves against rows captured today.
 *
 * The consent IP is deliberately NOT stored. It is the usual German practice
 * for proving opt-in, and it is also personal data we would be holding for a
 * dispute that cannot arise until mail is actually sent. Add it with the
 * sending provider, not before.
 */

/* -------------------------------------------------------------------------- */
/* Where to watch                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Which channel carries which league.
 *
 * Separate from `streams`, which is our OWN Cloudflare playback and applies to
 * one event. This is the standing answer to "where do I watch URKL" — a set of
 * broadcasters attached to a competition, most of them Chinese state channels
 * that will never have a per-event page here.
 *
 * `competitionId` rather than `eventId` because the question is asked about a
 * league far more often than about a night, and because the honest answer for
 * most leagues ("CCTV-10, CCTV Sports, CGTN, and a global CMG simulcast") does
 * not vary per event.
 */
export const watchChannels = pgTable(
  "watch_channels",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    /** "CCTV-10", "DAZN", "@UFBots on X". */
    name: text("name").notNull(),
    url: text("url"),
    /** "China", "Worldwide", "US only" — prose, because rights maps are prose. */
    region: text("region"),
    /** "Live only, no stream" and similar caveats worth more than the link. */
    note: text("note"),
    /** Ordering on the page. Lower first. */
    orderIndex: integer("order_index").notNull().default(0),
    sourceUrl: text("source_url"),
    confidence: confidence("confidence").notNull().default("reported"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("watch_channels_competition_id_idx").on(t.competitionId)],
);

/* -------------------------------------------------------------------------- */
/* How to enter                                                                */
/* -------------------------------------------------------------------------- */

/**
 * How a reader actually gets into a league.
 *
 * The most useful thing on this site and the one nobody else publishes: three
 * of the four active leagues will hand you a robot for free, and two of them
 * have no English-language entry portal at all. That is a fact a person can act
 * on, which is more than a results table can say.
 *
 * A table rather than a page of prose because it has to stay true. Entry
 * addresses, prize pools and deadlines change per season, and a hard-coded page
 * is one that quietly sends people to a dead mailbox a year from now.
 */
export const entryRoutes = pgTable(
  "entry_routes",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    /** "Pilot", "Ghost (engineering)", "Individual operator, no robot". */
    role: text("role").notNull(),
    /** What you actually do to enter, in prose. */
    howToEnter: text("how_to_enter").notNull(),
    /** The link or address. `contact` when it is an email or a WeChat keyword. */
    url: text("url"),
    contact: text("contact"),
    /** True when the league supplies the machine — the headline fact. */
    hardwareProvided: boolean("hardware_provided").notNull().default(false),
    hardwareNote: text("hardware_note"),
    prize: text("prize"),
    /** Null means none published, which is itself worth printing. */
    deadline: text("deadline"),
    /** Language, visa, entity and export barriers a reader will hit. */
    barriers: text("barriers"),
    orderIndex: integer("order_index").notNull().default(0),
    sourceUrl: text("source_url"),
    confidence: confidence("confidence").notNull().default("reported"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("entry_routes_competition_id_idx").on(t.competitionId)],
);

/* -------------------------------------------------------------------------- */
/* Open questions                                                              */
/* -------------------------------------------------------------------------- */

/**
 * What is NOT known, published deliberately.
 *
 * The counter-intuitive page and probably the most defensible one: two World
 * Humanoid Robot Games have now been held with kickboxing as a scored event and
 * NOBODY has published the medallists. EngineAI ran a full-size championship in
 * December 2025 and never released a winner.
 *
 * A site that omits those looks complete and is wrong. A site that lists them
 * is the only place tracking them, which is what a record is for. It also
 * doubles as this project's own work queue — every row is a story if it ever
 * resolves.
 */
export const openQuestions = pgTable(
  "open_questions",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    /** The question as a question. "Who won the WHRG 2026 martial arts event?" */
    question: text("question").notNull(),
    /** What IS known, what was checked, and why it is still open. */
    detail: text("detail").notNull(),
    /** Which league it belongs to, when it belongs to one. */
    competitionId: integer("competition_id").references(() => competitions.id, {
      onDelete: "set null",
    }),
    eventId: integer("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    /**
     * Null while open. Set with `answer` when it resolves — the row stays,
     * because "this was unknown for eight months and then Xinhua published it"
     * is a more useful record than a silently deleted question.
     */
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    answer: text("answer"),
    sourceUrl: text("source_url"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("open_questions_answered_at_idx").on(t.answeredAt)],
);

export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    /**
     * Lowercased before insert. Postgres compares text case-sensitively, so
     * without normalising, `Tobi@x.com` and `tobi@x.com` are two rows that the
     * UNIQUE constraint is perfectly happy with and that both get mailed.
     */
    email: text("email").notNull().unique(),
    /** Which surface captured it — "footer", "event:riyadh-2026", "home". */
    source: text("source"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    unsubscribeToken: text("unsubscribe_token")
      .notNull()
      .unique()
      .default(sql`gen_random_uuid()`),
    /**
     * Separate from `unsubscribeToken`, and it has to be.
     *
     * One token doing both jobs means the unsubscribe link at the foot of every
     * mail would also be a valid confirm link — so a subscriber who wanted out
     * could be counted as newly opted in, and anyone who saw one mail could
     * confirm an address that never answered. Two secrets, two verbs.
     */
    confirmToken: text("confirm_token")
      .notNull()
      .unique()
      .default(sql`gen_random_uuid()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("subscribers_created_at_idx").on(t.createdAt)],
);

/**
 * One mail-out that actually went, and the reason it cannot go twice.
 *
 * `key` is the idempotency claim, not a label: "weekly:2026-W37",
 * "event:12". The send path INSERTs the key first and only mails if the insert
 * won. A cron that fires twice — Vercel retries, a manual trigger during an
 * automatic run, a redeploy mid-send — therefore mails once. Everything else
 * here is an audit trail; the UNIQUE is the mechanism.
 *
 * Note what this deliberately does NOT store: who received it. Per-recipient
 * delivery records are a different table with different retention questions,
 * and a count answers "did the Thursday send go out and to how many" without
 * holding a copy of the list at every point in time.
 */
export const newsletterSends = pgTable("newsletter_sends", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  /** weekly | event | test — what shape of mail this was. */
  kind: text("kind").notNull(),
  subject: text("subject").notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  /** Non-null once delivery finished; null means a claim that never completed. */
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Audit                                                                       */
/* -------------------------------------------------------------------------- */

export const adminAudit = pgTable(
  "admin_audit",
  {
    id: serial("id").primaryKey(),
    adminEmail: text("admin_email").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    payloadJson: jsonb("payload_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("admin_audit_created_at_idx").on(t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* Relations                                                                   */
/* -------------------------------------------------------------------------- */

export const competitionsRelations = relations(competitions, ({ one, many }) => ({
  pointsRule: one(pointsRules, {
    fields: [competitions.id],
    references: [pointsRules.competitionId],
  }),
  events: many(events),
  bouts: many(bouts),
}));

export const pointsRulesRelations = relations(pointsRules, ({ one }) => ({
  competition: one(competitions, {
    fields: [pointsRules.competitionId],
    references: [competitions.id],
  }),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  robots: many(robots),
}));

export const robotsRelations = relations(robots, ({ one }) => ({
  team: one(teams, { fields: [robots.teamId], references: [teams.id] }),
  manufacturer: one(manufacturers, {
    fields: [robots.manufacturerId],
    references: [manufacturers.id],
  }),
}));

export const manufacturersRelations = relations(manufacturers, ({ many }) => ({
  robots: many(robots),
}));

export const pilotsRelations = relations(pilots, ({ one }) => ({
  competition: one(competitions, {
    fields: [pilots.competitionId],
    references: [competitions.id],
  }),
}));

export const watchChannelsRelations = relations(watchChannels, ({ one }) => ({
  competition: one(competitions, {
    fields: [watchChannels.competitionId],
    references: [competitions.id],
  }),
}));

export const entryRoutesRelations = relations(entryRoutes, ({ one }) => ({
  competition: one(competitions, {
    fields: [entryRoutes.competitionId],
    references: [competitions.id],
  }),
}));

export const openQuestionsRelations = relations(openQuestions, ({ one }) => ({
  competition: one(competitions, {
    fields: [openQuestions.competitionId],
    references: [competitions.id],
  }),
  event: one(events, {
    fields: [openQuestions.eventId],
    references: [events.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [events.competitionId],
    references: [competitions.id],
  }),
  bouts: many(bouts),
  stream: one(streams, {
    fields: [events.id],
    references: [streams.eventId],
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  event: one(events, { fields: [posts.eventId], references: [events.id] }),
}));

export const boutsRelations = relations(bouts, ({ one }) => ({
  event: one(events, { fields: [bouts.eventId], references: [events.id] }),
  competition: one(competitions, {
    fields: [bouts.competitionId],
    references: [competitions.id],
  }),
  robotA: one(robots, { fields: [bouts.robotAId], references: [robots.id] }),
  robotB: one(robots, { fields: [bouts.robotBId], references: [robots.id] }),
  // The teams as of this bout, not the robots' current teams.
  teamA: one(teams, { fields: [bouts.teamAId], references: [teams.id] }),
  teamB: one(teams, { fields: [bouts.teamBId], references: [teams.id] }),
  pilotA: one(pilots, { fields: [bouts.pilotAId], references: [pilots.id] }),
  pilotB: one(pilots, { fields: [bouts.pilotBId], references: [pilots.id] }),
  result: one(boutResults, {
    fields: [bouts.id],
    references: [boutResults.boutId],
  }),
}));

export const boutResultsRelations = relations(boutResults, ({ one }) => ({
  bout: one(bouts, { fields: [boutResults.boutId], references: [bouts.id] }),
  winner: one(robots, {
    fields: [boutResults.winnerRobotId],
    references: [robots.id],
  }),
}));

export const streamsRelations = relations(streams, ({ one }) => ({
  event: one(events, { fields: [streams.eventId], references: [events.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  entitlements: many(entitlements),
  predictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, { fields: [predictions.userId], references: [users.id] }),
  bout: one(bouts, { fields: [predictions.boutId], references: [bouts.id] }),
  robot: one(robots, {
    fields: [predictions.robotId],
    references: [robots.id],
  }),
}));

export const entitlementsRelations = relations(entitlements, ({ one }) => ({
  user: one(users, { fields: [entitlements.userId], references: [users.id] }),
  event: one(events, {
    fields: [entitlements.eventId],
    references: [events.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/* Inferred types                                                              */
/* -------------------------------------------------------------------------- */

export type Competition = typeof competitions.$inferSelect;
export type PointsRule = typeof pointsRules.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Robot = typeof robots.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Bout = typeof bouts.$inferSelect;
export type BoutResult = typeof boutResults.$inferSelect;
export type Stream = typeof streams.$inferSelect;
export type User = typeof users.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Manufacturer = typeof manufacturers.$inferSelect;
export type Pilot = typeof pilots.$inferSelect;
export type WatchChannel = typeof watchChannels.$inferSelect;
export type EntryRoute = typeof entryRoutes.$inferSelect;
export type OpenQuestion = typeof openQuestions.$inferSelect;
export type PostKindValue = (typeof postKind.enumValues)[number];
export type PostStatusValue = (typeof postStatus.enumValues)[number];
export type BoutMethodValue = (typeof boutMethod.enumValues)[number];
export type EventAccessValue = (typeof eventAccess.enumValues)[number];
export type EntitlementKindValue = (typeof entitlementKind.enumValues)[number];
export type ConfidenceValue = (typeof confidence.enumValues)[number];
export type CompetitionClassValue = (typeof competitionClass.enumValues)[number];
export type EventKindValue = (typeof eventKind.enumValues)[number];
export type PilotRoleValue = (typeof pilotRole.enumValues)[number];
