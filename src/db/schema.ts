import {
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
export const pointsRules = pgTable("points_rules", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id")
    .notNull()
    .unique()
    .references(() => competitions.id, { onDelete: "cascade" }),
  winPoints: integer("win_points").notNull().default(3),
  drawPoints: integer("draw_points").notNull().default(1),
  lossPoints: integer("loss_points").notNull().default(0),
  koBonusPoints: integer("ko_bonus_points").notNull().default(1),
});

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
    teamId: integer("team_id")
      // restrict, not cascade: deleting a team must not silently delete the
      // robots whose bout history the standings are computed from.
      .notNull()
      .references(() => teams.id, { onDelete: "restrict" }),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("robots_team_id_idx").on(t.teamId)],
);

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
    /** UTC instant the broadcast starts. */
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    /**
     * IANA timezone of the VENUE, e.g. "Asia/Shanghai". Not the viewer's.
     * Stored so the site can print "8:00 AM ET · 8:00 PM Shenzhen" from one
     * instant without guessing where the event happened.
     */
    timezone: text("timezone").notNull().default("UTC"),
    status: eventStatus("status").notNull().default("scheduled"),
    posterUrl: text("poster_url"),
    /**
     * ISO 3166-1 alpha-2 codes this event may be played in, passed through to
     * Cloudflare Stream. Null means unrestricted.
     *
     * This is a contractual field, not a feature: broadcast rights are almost
     * always territory-limited, so the list comes from the rights agreement.
     */
    allowedCountries: text("allowed_countries").array(),
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
    scheduledRounds: integer("scheduled_rounds").notNull().default(3),
    status: boutStatus("status").notNull().default("scheduled"),
    startedAt: timestamp("started_at", { withTimezone: true }),
  },
  (t) => [
    index("bouts_event_id_idx").on(t.eventId),
    index("bouts_competition_id_idx").on(t.competitionId),
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
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bout_results_winner_idx").on(t.winnerRobotId),
    // A decisive method must name a winner; a drawn one must not. Without
    // this, a mis-click in the admin console produces a "KO" with nobody
    // winning, which the standings would silently score as a draw.
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
}));

export const boutsRelations = relations(bouts, ({ one }) => ({
  event: one(events, { fields: [bouts.eventId], references: [events.id] }),
  competition: one(competitions, {
    fields: [bouts.competitionId],
    references: [competitions.id],
  }),
  robotA: one(robots, { fields: [bouts.robotAId], references: [robots.id] }),
  robotB: one(robots, { fields: [bouts.robotBId], references: [robots.id] }),
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
export type BoutMethodValue = (typeof boutMethod.enumValues)[number];
