-- Two columns the schedule needs before it can carry announced-but-vague rows.
--
-- Applied with
--   npx tsx scripts/apply-migration.ts drizzle/0013_schedule_notes.sql
--
-- `events.note` is where the caveat beside a date goes -- "six stops announced,
-- cities unnamed", "the promoter's own site shows 2027, believed a typo". A
-- schedule that renders those as clean dates claims a precision the
-- announcement never had.
--
-- `competitions.is_league` marks a container that is not a league. Some events
-- belong to no competition: the Shanghai UFC demonstration was Unitree and the
-- UFC, and `events.competition_id` is NOT NULL. They hang off a container row
-- the leagues index filters out, rather than a fabricated league.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "note" text;
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "is_league" boolean NOT NULL DEFAULT true;
