import { cache } from "react";
import { and, asc, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  boutResults,
  bouts,
  competitions,
  entitlements,
  events,
  posts,
  predictions,
  robots,
  streams,
  teams,
  type BoutMethodValue,
} from "@/db/schema";

/**
 * Every read the public site performs.
 *
 * All of them are `cache()`d so that two components asking the same question
 * during one render share a single round trip rather than each opening its
 * own — the home page alone asks for the active competition from three
 * different places.
 */

/* -------------------------------------------------------------------------- */
/* Shared bout shape                                                           */
/* -------------------------------------------------------------------------- */

export type BoutParticipant = {
  id: number;
  slug: string;
  name: string;
  photoUrl: string | null;
  weightClass: string | null;
  teamId: number;
  teamName: string;
  teamSlug: string;
  /** ISO 3166-1 alpha-2, for the flag beside the corner. Null when unknown. */
  teamCountry: string | null;
};

export type BoutDetail = {
  id: number;
  orderIndex: number;
  scheduledRounds: number;
  status: "scheduled" | "live" | "completed";
  event: {
    id: number;
    slug: string;
    name: string;
    startsAt: Date;
    startTimeTbd: boolean;
    timezone: string;
    city: string | null;
    country: string | null;
    venue: string | null;
    status: "scheduled" | "live" | "completed" | "cancelled";
  };
  competitionSlug: string;
  competitionName: string;
  robotA: BoutParticipant;
  robotB: BoutParticipant;
  result: {
    winnerRobotId: number | null;
    method: BoutMethodValue;
    endRound: number | null;
    endTimeSeconds: number | null;
    knockdownsA: number;
    knockdownsB: number;
    notes: string | null;
  } | null;
};

const robotA = alias(robots, "robot_a");
const robotB = alias(robots, "robot_b");
const teamA = alias(teams, "team_a");
const teamB = alias(teams, "team_b");

/**
 * One selection shape for every bout query on the site.
 *
 * Teams come from the bout's own team columns, NOT from each robot's current
 * team — a robot that transfers must not drag its finished results to a new
 * team. See the note on `bouts.teamAId` in the schema.
 */
const boutSelection = {
  id: bouts.id,
  orderIndex: bouts.orderIndex,
  scheduledRounds: bouts.scheduledRounds,
  status: bouts.status,
  eventId: events.id,
  eventSlug: events.slug,
  eventName: events.name,
  eventStartsAt: events.startsAt,
  eventStartTimeTbd: events.startTimeTbd,
  eventTimezone: events.timezone,
  eventCity: events.city,
  eventCountry: events.country,
  eventVenue: events.venue,
  eventStatus: events.status,
  competitionSlug: competitions.slug,
  competitionName: competitions.name,

  aId: robotA.id,
  aSlug: robotA.slug,
  aName: robotA.name,
  aPhoto: robotA.photoUrl,
  aWeight: robotA.weightClass,
  aTeamId: teamA.id,
  aTeamName: teamA.name,
  aTeamSlug: teamA.slug,
  aTeamCountry: teamA.country,

  bId: robotB.id,
  bSlug: robotB.slug,
  bName: robotB.name,
  bPhoto: robotB.photoUrl,
  bWeight: robotB.weightClass,
  bTeamId: teamB.id,
  bTeamName: teamB.name,
  bTeamSlug: teamB.slug,
  bTeamCountry: teamB.country,

  winnerRobotId: boutResults.winnerRobotId,
  method: boutResults.method,
  endRound: boutResults.endRound,
  endTimeSeconds: boutResults.endTimeSeconds,
  knockdownsA: boutResults.knockdownsA,
  knockdownsB: boutResults.knockdownsB,
  notes: boutResults.notes,
};

type BoutRow = {
  [K in keyof typeof boutSelection]: unknown;
};

function toBoutDetail(r: Record<string, unknown>): BoutDetail {
  return {
    id: r.id as number,
    orderIndex: r.orderIndex as number,
    scheduledRounds: r.scheduledRounds as number,
    status: r.status as BoutDetail["status"],
    event: {
      id: r.eventId as number,
      slug: r.eventSlug as string,
      name: r.eventName as string,
      startsAt: r.eventStartsAt as Date,
      startTimeTbd: r.eventStartTimeTbd as boolean,
      timezone: r.eventTimezone as string,
      city: r.eventCity as string | null,
      country: r.eventCountry as string | null,
      venue: r.eventVenue as string | null,
      status: r.eventStatus as BoutDetail["event"]["status"],
    },
    competitionSlug: r.competitionSlug as string,
    competitionName: r.competitionName as string,
    robotA: {
      id: r.aId as number,
      slug: r.aSlug as string,
      name: r.aName as string,
      photoUrl: r.aPhoto as string | null,
      weightClass: r.aWeight as string | null,
      teamId: r.aTeamId as number,
      teamName: r.aTeamName as string,
      teamSlug: r.aTeamSlug as string,
      teamCountry: r.aTeamCountry as string | null,
    },
    robotB: {
      id: r.bId as number,
      slug: r.bSlug as string,
      name: r.bName as string,
      photoUrl: r.bPhoto as string | null,
      weightClass: r.bWeight as string | null,
      teamId: r.bTeamId as number,
      teamName: r.bTeamName as string,
      teamSlug: r.bTeamSlug as string,
      teamCountry: r.bTeamCountry as string | null,
    },
    // Explicit null check, not truthiness: a falsy-but-present method would
    // silently turn a resolved bout into an unresolved one.
    result:
      r.method != null
        ? {
            winnerRobotId: r.winnerRobotId as number | null,
            method: r.method as BoutMethodValue,
            endRound: r.endRound as number | null,
            endTimeSeconds: r.endTimeSeconds as number | null,
            knockdownsA: (r.knockdownsA as number) ?? 0,
            knockdownsB: (r.knockdownsB as number) ?? 0,
            notes: r.notes as string | null,
          }
        : null,
  };
}

function boutQuery() {
  return db
    .select(boutSelection)
    .from(bouts)
    .innerJoin(events, eq(bouts.eventId, events.id))
    .innerJoin(competitions, eq(bouts.competitionId, competitions.id))
    .innerJoin(robotA, eq(bouts.robotAId, robotA.id))
    .innerJoin(robotB, eq(bouts.robotBId, robotB.id))
    .innerJoin(teamA, eq(bouts.teamAId, teamA.id))
    .innerJoin(teamB, eq(bouts.teamBId, teamB.id))
    // LEFT so unresolved bouts survive with a null result.
    .leftJoin(boutResults, eq(boutResults.boutId, bouts.id));
}

/* -------------------------------------------------------------------------- */
/* Competitions                                                                */
/* -------------------------------------------------------------------------- */

export const getCompetitions = cache(async () => {
  return db
    .select()
    .from(competitions)
    .orderBy(desc(competitions.seasonYear), asc(competitions.name));
});

export const getCompetitionBySlug = cache(async (slug: string) => {
  const rows = await db
    .select()
    .from(competitions)
    .where(eq(competitions.slug, slug))
    .limit(1);
  return rows[0] ?? null;
});

/** The season the site leads with when nothing more specific is asked for. */
export const getPrimaryCompetition = cache(async () => {
  const active = await db
    .select()
    .from(competitions)
    .where(eq(competitions.status, "active"))
    .orderBy(desc(competitions.seasonYear))
    .limit(1);
  if (active[0]) return active[0];

  const any = await db
    .select()
    .from(competitions)
    .orderBy(desc(competitions.seasonYear))
    .limit(1);
  return any[0] ?? null;
});

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

export const getEventBySlug = cache(async (slug: string) => {
  const rows = await db
    .select({
      event: events,
      competitionSlug: competitions.slug,
      competitionName: competitions.name,
    })
    .from(events)
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(eq(events.slug, slug))
    .limit(1);
  return rows[0] ?? null;
});

/**
 * The next event that has not happened yet.
 *
 * Ordered by start time rather than filtered on `status`, because an event
 * keeps `scheduled` right up until an admin flips it live — the countdown
 * needs the soonest future fixture, not the soonest un-flipped one.
 */
export const getNextEvent = cache(async () => {
  const rows = await db
    .select({
      event: events,
      competitionSlug: competitions.slug,
      competitionName: competitions.name,
    })
    .from(events)
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(
      and(
        eq(events.status, "scheduled"),
        sql`${events.startsAt} > now()`,
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(1);
  return rows[0] ?? null;
});

/**
 * The one event the whole site should be pointing at right now.
 *
 * Live wins over upcoming, and both are resolved across EVERY league rather
 * than within a chosen one — that is the difference between this site and
 * Formula1.com, whose equivalent bar can assume there is only one championship
 * to be next in.
 *
 * Returns the full event row so the strip can render the venue, the timezone
 * and the where-to-watch link without a second lookup.
 */
export const getFeaturedEvent = cache(async () => {
  const select = {
    event: events,
    competitionSlug: competitions.slug,
    competitionName: competitions.name,
  };

  const live = await db
    .select(select)
    .from(events)
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(eq(events.status, "live"))
    .orderBy(asc(events.startsAt))
    .limit(1);
  if (live[0]) return { ...live[0], isLive: true as const };

  const next = await db
    .select(select)
    .from(events)
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(and(eq(events.status, "scheduled"), sql`${events.startsAt} > now()`))
    .orderBy(asc(events.startsAt))
    .limit(1);
  return next[0] ? { ...next[0], isLive: false as const } : null;
});

/**
 * The most recently finished event, across every league.
 *
 * Pairs with `getNextEvent()` to give the home page one thing behind and one
 * ahead. That framing is not decoration — with roughly one event a month
 * across the whole sport, a grid of "recent activity" is mostly whitespace,
 * whereas "here is the last one and here is the next" is always exactly two
 * things and always true.
 */
export const getMostRecentCompletedEvent = cache(async () => {
  const rows = await db
    .select({
      event: events,
      competitionSlug: competitions.slug,
      competitionName: competitions.name,
    })
    .from(events)
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(eq(events.status, "completed"))
    .orderBy(desc(events.startsAt))
    .limit(1);
  return rows[0] ?? null;
});

/**
 * Every league, with its next fixture and how many events it has staged.
 *
 * This is the query the site is actually for, and it has no equivalent on
 * UFC.com or Formula1.com because those cover ONE competition. Here there are
 * five, in four countries, on different hardware, and a visitor's first
 * question is not "who is winning" but "who runs what". Nobody has to be told
 * what the NFL is; everybody has to be told what URKL is.
 *
 * Three queries and a join in JavaScript rather than correlated subqueries per
 * column. The row counts are tiny, and the SQL version needs one subquery per
 * field of the next event — which reads badly and is easy to get subtly
 * inconsistent when one of them is edited.
 */
export const getLeaguesOverview = cache(async () => {
  const [leagues, upcoming, counts] = await Promise.all([
    db
      .select()
      .from(competitions)
      // Active leagues first — a visitor cares about what is running now, and
      // sorting purely by year would bury a live 2026 season under a finished
      // one if the finished one happened to be numbered higher.
      .orderBy(
        sql`case ${competitions.status} when 'active' then 0 when 'upcoming' then 1 else 2 end`,
        desc(competitions.seasonYear),
        asc(competitions.name),
      ),
    db
      .select({
        competitionId: events.competitionId,
        slug: events.slug,
        name: events.name,
        startsAt: events.startsAt,
        startTimeTbd: events.startTimeTbd,
        timezone: events.timezone,
        city: events.city,
      })
      .from(events)
      .where(and(eq(events.status, "scheduled"), sql`${events.startsAt} > now()`))
      .orderBy(asc(events.startsAt)),
    db
      .select({
        competitionId: events.competitionId,
        total: sql<number>`count(*)::int`,
      })
      .from(events)
      .groupBy(events.competitionId),
  ]);

  // First match wins because `upcoming` is already sorted by start time, so
  // this picks each league's SOONEST fixture rather than an arbitrary one.
  const nextByCompetition = new Map<number, (typeof upcoming)[number]>();
  for (const event of upcoming) {
    if (!nextByCompetition.has(event.competitionId)) {
      nextByCompetition.set(event.competitionId, event);
    }
  }
  const countByCompetition = new Map(
    counts.map((c) => [c.competitionId, c.total]),
  );

  return leagues.map((league) => ({
    league,
    nextEvent: nextByCompetition.get(league.id) ?? null,
    eventCount: countByCompetition.get(league.id) ?? 0,
  }));
});

export const getUpcomingEvents = cache(async (competitionSlug?: string) => {
  const conditions = [eq(events.status, "scheduled")];
  if (competitionSlug) conditions.push(eq(competitions.slug, competitionSlug));

  return db
    .select({
      event: events,
      competitionSlug: competitions.slug,
      competitionName: competitions.name,
      boutCount: sql<number>`(select count(*) from ${bouts} where ${bouts.eventId} = ${events.id})::int`,
    })
    .from(events)
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(and(...conditions))
    .orderBy(asc(events.startsAt));
});

/**
 * Events that have already happened, newest first.
 *
 * Queried on `status` rather than derived from recorded results — an event
 * that ran but whose results have not been entered yet is still an event that
 * happened, and deriving this list from `bout_results` would make it vanish
 * from the archive until someone typed its card in.
 */
export const getPastEvents = cache(async () => {
  return db
    .select({
      event: events,
      competitionSlug: competitions.slug,
      competitionName: competitions.name,
    })
    .from(events)
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(eq(events.status, "completed"))
    .orderBy(desc(events.startsAt));
});

/**
 * When this league's table last moved.
 *
 * HLTV stamps its world ranking "Last updated: 7th of Sep" and that one line
 * does more for credibility than the ranking itself. A table with no date on
 * it makes an unbounded claim — it asserts it is current, forever, and a
 * reader who suspects otherwise has no way to check. A dated one says exactly
 * what it is: correct as of a moment.
 *
 * Reads `recorded_at`, not the event date, because the question is when WE
 * learned the result. On a site that covers other people's leagues from
 * English-language reporting, those two can be days apart, and the honest
 * answer is the later one.
 */
export const getLastResultRecordedAt = cache(async (competitionId: number) => {
  const rows = await db
    .select({ recordedAt: boutResults.recordedAt })
    .from(boutResults)
    .innerJoin(bouts, eq(boutResults.boutId, bouts.id))
    .where(eq(bouts.competitionId, competitionId))
    .orderBy(desc(boutResults.recordedAt))
    .limit(1);
  return rows[0]?.recordedAt ?? null;
});

export const getEventsForCompetition = cache(async (competitionId: number) => {
  return db
    .select({
      event: events,
      // `${events}.id`, not `${events.id}` — same single-table qualification
      // bug as getTeams above: without a join in the outer query, drizzle
      // rendered the correlated column as bare `"id"`, which bound to
      // bouts.id inside the subquery and counted zero forever. Surfaced as
      // "0 bouts" on a league page whose standings table counted the same
      // bout fine.
      boutCount: sql<number>`(select count(*) from ${bouts} where ${bouts.eventId} = ${events}.id)::int`,
    })
    .from(events)
    .where(eq(events.competitionId, competitionId))
    .orderBy(asc(events.startsAt));
});

/**
 * Every entitlement a viewer holds.
 *
 * Returns them all rather than filtering in SQL by the event's start time.
 * Nobody accumulates more than a handful of rows, and doing the window
 * comparison in one tested pure function beats splitting the paywall's logic
 * across a query and a function where the two can disagree.
 */
export const getEntitlementsForUser = cache(async (userId: number) => {
  return db
    .select({
      kind: entitlements.kind,
      eventId: entitlements.eventId,
      startsAt: entitlements.startsAt,
      endsAt: entitlements.endsAt,
    })
    .from(entitlements)
    .where(eq(entitlements.userId, userId));
});

/** The Cloudflare stream record for an event, if one has been created. */
export const getStreamForEvent = cache(async (eventId: number) => {
  const rows = await db
    .select()
    .from(streams)
    .where(eq(streams.eventId, eventId))
    .limit(1);
  return rows[0] ?? null;
});

/* -------------------------------------------------------------------------- */
/* Bouts                                                                       */
/* -------------------------------------------------------------------------- */

export const getBoutsForEvent = cache(async (eventId: number) => {
  const rows = await boutQuery()
    .where(eq(bouts.eventId, eventId))
    .orderBy(asc(bouts.orderIndex));
  return rows.map(toBoutDetail);
});

/** Most recently finished bouts across the whole site. */
export const getLatestResults = cache(async (limit = 6, competitionSlug?: string) => {
  const conditions = [isNotNull(boutResults.id)];
  if (competitionSlug) conditions.push(eq(competitions.slug, competitionSlug));

  const rows = await boutQuery()
    .where(and(...conditions))
    .orderBy(desc(events.startsAt), desc(bouts.orderIndex))
    .limit(limit);
  return rows.map(toBoutDetail);
});

/** Every finished bout, newest first. Powers /results. */
export const getAllResults = cache(async (competitionSlug?: string) => {
  const conditions = [isNotNull(boutResults.id)];
  if (competitionSlug) conditions.push(eq(competitions.slug, competitionSlug));

  const rows = await boutQuery()
    .where(and(...conditions))
    .orderBy(desc(events.startsAt), desc(bouts.orderIndex));
  return rows.map(toBoutDetail);
});

/** Every bout not yet resolved, soonest first. Powers /schedule. */
export const getUpcomingBouts = cache(async (competitionSlug?: string) => {
  const conditions = [isNull(boutResults.id)];
  if (competitionSlug) conditions.push(eq(competitions.slug, competitionSlug));

  const rows = await boutQuery()
    .where(and(...conditions))
    .orderBy(asc(events.startsAt), asc(bouts.orderIndex));
  return rows.map(toBoutDetail);
});

/** A robot's complete fight history, newest first. */
export const getBoutsForRobot = cache(async (robotId: number) => {
  const rows = await boutQuery()
    .where(or(eq(bouts.robotAId, robotId), eq(bouts.robotBId, robotId)))
    .orderBy(desc(events.startsAt), desc(bouts.orderIndex));
  return rows.map(toBoutDetail);
});

/** Every bout either of a team's robots was booked in, newest first. */
export const getBoutsForTeam = cache(async (teamId: number) => {
  const rows = await boutQuery()
    .where(or(eq(bouts.teamAId, teamId), eq(bouts.teamBId, teamId)))
    .orderBy(desc(events.startsAt), desc(bouts.orderIndex));
  return rows.map(toBoutDetail);
});

/* -------------------------------------------------------------------------- */
/* Teams and robots                                                            */
/* -------------------------------------------------------------------------- */

export const getTeams = cache(async () => {
  return db
    .select({
      team: teams,
      // `${teams}.id`, NOT `${teams.id}` — and the difference was a live bug
      // that shipped with the very first version of this query. When the
      // outer query selects FROM a single table, drizzle renders column refs
      // UNQUALIFIED, so `${teams.id}` became bare `"id"` inside the
      // subquery — where it bound to robots.id, making the correlation
      // `robots.team_id = robots.id`: false for every row that ever existed.
      // Every team showed "0 robots" from day one and the demo data made it
      // look plausible. The joined boutCount queries below dodge this by
      // accident: with a join present, drizzle qualifies everything.
      robotCount: sql<number>`(select count(*) from ${robots} where ${robots.teamId} = ${teams}.id)::int`,
    })
    .from(teams)
    .orderBy(asc(teams.name));
});

export const getTeamBySlug = cache(async (slug: string) => {
  const rows = await db.select().from(teams).where(eq(teams.slug, slug)).limit(1);
  return rows[0] ?? null;
});

export const getRobotsForTeam = cache(async (teamId: number) => {
  return db
    .select()
    .from(robots)
    .where(eq(robots.teamId, teamId))
    .orderBy(asc(robots.name));
});

export const getRobotBySlug = cache(async (slug: string) => {
  const rows = await db
    .select({
      robot: robots,
      teamName: teams.name,
      teamSlug: teams.slug,
      teamLogoUrl: teams.logoUrl,
    })
    .from(robots)
    .innerJoin(teams, eq(robots.teamId, teams.id))
    .where(eq(robots.slug, slug))
    .limit(1);
  return rows[0] ?? null;
});

/* -------------------------------------------------------------------------- */
/* Posts                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The condition that makes a post public.
 *
 * BOTH halves, every time. `status = 'published'` alone publishes a scheduled
 * post the moment it is saved; `published_at <= now()` alone publishes a draft
 * that happens to have a date on it. Defined once here because it appears in
 * four queries and the one that gets it wrong is the one that leaks a draft.
 */
const isPublic = () =>
  and(
    eq(posts.status, "published"),
    isNotNull(posts.publishedAt),
    sql`${posts.publishedAt} <= now()`,
  );

/** The feed. Newest first. */
export const getPublishedPosts = cache(async (limit?: number) => {
  const query = db
    .select({
      post: posts,
      eventSlug: events.slug,
      eventName: events.name,
    })
    .from(posts)
    // LEFT: a post does not have to be about an event, and an inner join would
    // silently drop every general piece from the feed.
    .leftJoin(events, eq(posts.eventId, events.id))
    .where(isPublic())
    .orderBy(desc(posts.publishedAt));

  return limit ? query.limit(limit) : query;
});

export const getPostBySlug = cache(async (slug: string) => {
  const rows = await db
    .select({
      post: posts,
      eventSlug: events.slug,
      eventName: events.name,
      eventStartsAt: events.startsAt,
    })
    .from(posts)
    .leftJoin(events, eq(posts.eventId, events.id))
    .where(and(eq(posts.slug, slug), isPublic()))
    .limit(1);
  return rows[0] ?? null;
});

/** Coverage attached to one event, for the event page. */
export const getPostsForEvent = cache(async (eventId: number) => {
  return db
    .select()
    .from(posts)
    .where(and(eq(posts.eventId, eventId), isPublic()))
    .orderBy(desc(posts.publishedAt));
});

/**
 * Every post including drafts, for the admin list.
 *
 * Deliberately a separate function from `getPublishedPosts` rather than a flag
 * on it. A boolean parameter that switches off the visibility filter is one
 * mistaken call site away from putting drafts on the public feed; two
 * functions cannot be confused by accident.
 */
export const getAllPostsForAdmin = cache(async () => {
  return db
    .select({
      post: posts,
      eventName: events.name,
    })
    .from(posts)
    .leftJoin(events, eq(posts.eventId, events.id))
    .orderBy(desc(posts.createdAt));
});

/* -------------------------------------------------------------------------- */
/* Predictions                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * What this viewer picked on each bout of one event.
 *
 * Returned as a Map so the card can look up a bout in constant time while
 * rendering. Empty for a signed-out visitor, which is the common case and is
 * not an error — they see the crowd split and a prompt to sign in.
 */
export const getUserPicksForEvent = cache(
  async (userId: number, eventId: number) => {
    const rows = await db
      .select({ boutId: predictions.boutId, robotId: predictions.robotId })
      .from(predictions)
      .innerJoin(bouts, eq(predictions.boutId, bouts.id))
      .where(and(eq(predictions.userId, userId), eq(bouts.eventId, eventId)));

    return new Map(rows.map((r) => [r.boutId, r.robotId]));
  },
);

/**
 * How everyone split on each bout of one event.
 *
 * One grouped query for the whole card rather than one per bout — a twelve
 * bout event would otherwise be twelve round trips to render one panel.
 *
 * Keyed by bout, then by robot, because the caller has a bout and its two
 * robots in hand and wants both counts. A robot with no picks is absent rather
 * than zero; `crowdSplit()` treats a missing count as 0.
 */
export const getCrowdPicksForEvent = cache(async (eventId: number) => {
  const rows = await db
    .select({
      boutId: predictions.boutId,
      robotId: predictions.robotId,
      count: sql<number>`count(*)::int`,
    })
    .from(predictions)
    .innerJoin(bouts, eq(predictions.boutId, bouts.id))
    .where(eq(bouts.eventId, eventId))
    .groupBy(predictions.boutId, predictions.robotId);

  const byBout = new Map<number, Map<number, number>>();
  for (const row of rows) {
    const forBout = byBout.get(row.boutId) ?? new Map<number, number>();
    forBout.set(row.robotId, row.count);
    byBout.set(row.boutId, forBout);
  }
  return byBout;
});

/**
 * Every pick this viewer has made, with the result if there is one.
 *
 * Deliberately returns rows rather than a computed record: the grading rules
 * live in one tested pure function in `@/lib/predictions`, and duplicating
 * "a draw is void" into SQL is how the two would eventually disagree about
 * someone's accuracy.
 */
export const getPicksWithResultsForUser = cache(async (userId: number) => {
  // The picked robot is joined through `predictions.robotId`, NOT through
  // either of the bout's corner aliases. It is whichever of the two they
  // chose, and joining on a corner would silently name the wrong robot for
  // half the rows.
  const picked = alias(robots, "picked_robot");

  return db
    .select({
      boutId: predictions.boutId,
      robotId: predictions.robotId,
      robotName: picked.name,
      robotSlug: picked.slug,
      createdAt: predictions.createdAt,
      eventSlug: events.slug,
      eventName: events.name,
      eventStartsAt: events.startsAt,
      opponentAId: bouts.robotAId,
      opponentAName: robotA.name,
      opponentBName: robotB.name,
      winnerRobotId: boutResults.winnerRobotId,
      method: boutResults.method,
    })
    .from(predictions)
    .innerJoin(bouts, eq(predictions.boutId, bouts.id))
    .innerJoin(events, eq(bouts.eventId, events.id))
    .innerJoin(picked, eq(predictions.robotId, picked.id))
    .innerJoin(robotA, eq(bouts.robotAId, robotA.id))
    .innerJoin(robotB, eq(bouts.robotBId, robotB.id))
    .leftJoin(boutResults, eq(boutResults.boutId, bouts.id))
    .where(eq(predictions.userId, userId))
    .orderBy(desc(events.startsAt), asc(bouts.orderIndex));
});

/**
 * The bout a pick is being made on, with everything needed to accept or refuse
 * it: the two legal answers and the event's start time.
 *
 * One query rather than three, because the server action must not be able to
 * validate against a bout it fetched separately from the event whose deadline
 * it checked.
 */
export const getBoutForPicking = cache(async (boutId: number) => {
  const rows = await db
    .select({
      boutId: bouts.id,
      robotAId: bouts.robotAId,
      robotBId: bouts.robotBId,
      eventSlug: events.slug,
      eventStartsAt: events.startsAt,
      eventStatus: events.status,
    })
    .from(bouts)
    .innerJoin(events, eq(bouts.eventId, events.id))
    .where(eq(bouts.id, boutId))
    .limit(1);
  return rows[0] ?? null;
});

/* -------------------------------------------------------------------------- */
/* Sitemap                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every public detail page, for the sitemap.
 *
 * One function returning four lists rather than four exported queries, because
 * there is exactly one caller and splitting it would invite someone to use
 * "every robot slug in the database" for something that should be paginated.
 *
 * Deliberately unfiltered by status. A cancelled or long-finished event is
 * still a page worth indexing — the archive is most of what a reference site
 * is for, and "who won that fight in Riyadh" is a search that gets made for
 * years afterwards.
 */
export const getSitemapContent = cache(async () => {
  const [eventRows, competitionRows, teamRows, robotRows, postRows] =
    await Promise.all([
      db
        .select({ slug: events.slug, startsAt: events.startsAt })
        .from(events)
        .orderBy(desc(events.startsAt)),
      db.select({ slug: competitions.slug }).from(competitions),
      db.select({ slug: teams.slug }).from(teams),
      db.select({ slug: robots.slug }).from(robots),
      // Published only — the same two-part condition the public feed uses. A
      // draft listed here is a draft handed to a crawler.
      db
        .select({ slug: posts.slug, publishedAt: posts.publishedAt })
        .from(posts)
        .where(isPublic())
        .orderBy(desc(posts.publishedAt)),
    ]);

  return {
    events: eventRows,
    competitions: competitionRows,
    teams: teamRows,
    robots: robotRows,
    posts: postRows,
  };
});

export type { BoutRow };
