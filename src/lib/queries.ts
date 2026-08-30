import { cache } from "react";
import { and, asc, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  boutResults,
  bouts,
  competitions,
  events,
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

  bId: robotB.id,
  bSlug: robotB.slug,
  bName: robotB.name,
  bPhoto: robotB.photoUrl,
  bWeight: robotB.weightClass,
  bTeamId: teamB.id,
  bTeamName: teamB.name,
  bTeamSlug: teamB.slug,

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

export const getEventsForCompetition = cache(async (competitionId: number) => {
  return db
    .select({
      event: events,
      boutCount: sql<number>`(select count(*) from ${bouts} where ${bouts.eventId} = ${events.id})::int`,
    })
    .from(events)
    .where(eq(events.competitionId, competitionId))
    .orderBy(asc(events.startsAt));
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
      robotCount: sql<number>`(select count(*) from ${robots} where ${robots.teamId} = ${teams.id})::int`,
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

export type { BoutRow };
