-- The build-out: people, provenance, and the things that are not known.
--
-- Applied with
--   npx tsx scripts/apply-migration.ts drizzle/0012_record_buildout.sql
-- and NOT with `drizzle-kit push` (see 0009). Every statement is idempotent so
-- a re-run is a no-op -- the only way to know this ran is to run it.
--
-- Four ideas, in order of how much they change the site:
--
--   1. CONFIDENCE. Every fact-bearing table gains `confidence` and a source
--      URL. The site's claim is to be the record; a record that cannot say how
--      it knows something is a blog. Default is `reported`, not `confirmed` --
--      a default that overstates silently launders every unlabelled row.
--   2. PEOPLE. `pilots`, and pilot columns on `bouts`. This sport's entire
--      appeal is that a person is driving, and the site had no humans on it.
--   3. CLASSES. `competitions.class` and `robots.class` keep piloted mechs
--      (Robowar, GD01) and wheeled combat (BattleBots, NHRL) out of humanoid
--      standings, and `events.kind` keeps exhibitions out of results.
--   4. MAKERS. `manufacturers`, so Unitree stops appearing to fight itself.

-- ---------------------------------------------------------------- enums ----
-- CREATE TYPE has no IF NOT EXISTS before PG 16 and this database is older, so
-- each one is wrapped. DO blocks contain semicolons, which is exactly why the
-- apply script splits on the breakpoint marker and never on ";".
DO $$ BEGIN
  CREATE TYPE "confidence" AS ENUM ('confirmed', 'reported', 'unconfirmed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "competition_class" AS ENUM ('humanoid', 'piloted_mech', 'adjacent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "event_kind" AS ENUM ('competition', 'exhibition');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "pilot_role" AS ENUM ('pilot', 'founder', 'referee', 'executive', 'engineer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

-- -------------------------------------------------------- manufacturers ----
CREATE TABLE IF NOT EXISTS "manufacturers" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "name_local" text,
  "country" text,
  "founded_year" integer,
  "website_url" text,
  "logo_url" text,
  "bio" text,
  "source_url" text,
  "confidence" "confidence" DEFAULT 'reported' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "manufacturers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- --------------------------------------------------------------- pilots ----
CREATE TABLE IF NOT EXISTS "pilots" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "name_local" text,
  "role" "pilot_role" DEFAULT 'pilot' NOT NULL,
  "nationality" text,
  "competition_id" integer,
  "affiliation" text,
  "photo_url" text,
  "bio" text,
  "notable_result" text,
  "source_url" text,
  "confidence" "confidence" DEFAULT 'reported' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pilots_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

ALTER TABLE "pilots" DROP CONSTRAINT IF EXISTS "pilots_competition_id_competitions_id_fk";
--> statement-breakpoint
ALTER TABLE "pilots" ADD CONSTRAINT "pilots_competition_id_competitions_id_fk"
  FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- ------------------------------------------------------- watch channels ----
CREATE TABLE IF NOT EXISTS "watch_channels" (
  "id" serial PRIMARY KEY NOT NULL,
  "competition_id" integer NOT NULL,
  "name" text NOT NULL,
  "url" text,
  "region" text,
  "note" text,
  "order_index" integer DEFAULT 0 NOT NULL,
  "source_url" text,
  "confidence" "confidence" DEFAULT 'reported' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "watch_channels" DROP CONSTRAINT IF EXISTS "watch_channels_competition_id_competitions_id_fk";
--> statement-breakpoint
ALTER TABLE "watch_channels" ADD CONSTRAINT "watch_channels_competition_id_competitions_id_fk"
  FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "watch_channels_competition_id_idx" ON "watch_channels" USING btree ("competition_id");
--> statement-breakpoint

-- ---------------------------------------------------------- entry routes ---
CREATE TABLE IF NOT EXISTS "entry_routes" (
  "id" serial PRIMARY KEY NOT NULL,
  "competition_id" integer NOT NULL,
  "role" text NOT NULL,
  "how_to_enter" text NOT NULL,
  "url" text,
  "contact" text,
  "hardware_provided" boolean DEFAULT false NOT NULL,
  "hardware_note" text,
  "prize" text,
  "deadline" text,
  "barriers" text,
  "order_index" integer DEFAULT 0 NOT NULL,
  "source_url" text,
  "confidence" "confidence" DEFAULT 'reported' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "entry_routes" DROP CONSTRAINT IF EXISTS "entry_routes_competition_id_competitions_id_fk";
--> statement-breakpoint
ALTER TABLE "entry_routes" ADD CONSTRAINT "entry_routes_competition_id_competitions_id_fk"
  FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entry_routes_competition_id_idx" ON "entry_routes" USING btree ("competition_id");
--> statement-breakpoint

-- -------------------------------------------------------- open questions ---
CREATE TABLE IF NOT EXISTS "open_questions" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "question" text NOT NULL,
  "detail" text NOT NULL,
  "competition_id" integer,
  "event_id" integer,
  "answered_at" timestamp with time zone,
  "answer" text,
  "source_url" text,
  "order_index" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "open_questions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

ALTER TABLE "open_questions" DROP CONSTRAINT IF EXISTS "open_questions_competition_id_competitions_id_fk";
--> statement-breakpoint
ALTER TABLE "open_questions" ADD CONSTRAINT "open_questions_competition_id_competitions_id_fk"
  FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "open_questions" DROP CONSTRAINT IF EXISTS "open_questions_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "open_questions" ADD CONSTRAINT "open_questions_event_id_events_id_fk"
  FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "open_questions_answered_at_idx" ON "open_questions" USING btree ("answered_at");
--> statement-breakpoint

-- --------------------------------------------------------- competitions ----
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "class" "competition_class" DEFAULT 'humanoid' NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "country" text;
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "city" text;
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "founded_year" integer;
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "website_url" text;
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "source_url" text;
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "confidence" "confidence" DEFAULT 'reported' NOT NULL;
--> statement-breakpoint

-- --------------------------------------------------------------- events ----
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "date_tbd" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "date_label" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ends_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "kind" "event_kind" DEFAULT 'competition' NOT NULL;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "confidence" "confidence" DEFAULT 'reported' NOT NULL;
--> statement-breakpoint

-- A window that ends before it starts is a typo that renders as a season
-- lasting minus four months, and UFB's own site currently displays exactly
-- that ("October 1, 2027 - March 31, 2027"). Catch ours at the door.
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_ends_after_start";
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_ends_after_start"
  CHECK ("ends_at" IS NULL OR "ends_at" >= "starts_at");
--> statement-breakpoint

-- --------------------------------------------------------------- robots ----
-- The nullability change that makes the Machines page possible: a platform
-- model (Unitree H2, Booster T1) is a product, not a competitor, and belongs to
-- no team. Forcing a team onto those rows is what made Unitree look like a
-- fighter. Bouts still require both teams -- see the importer's guard.
ALTER TABLE "robots" ALTER COLUMN "team_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "manufacturer_id" integer;
--> statement-breakpoint
ALTER TABLE "robots" DROP CONSTRAINT IF EXISTS "robots_manufacturer_id_manufacturers_id_fk";
--> statement-breakpoint
ALTER TABLE "robots" ADD CONSTRAINT "robots_manufacturer_id_manufacturers_id_fk"
  FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "robots_manufacturer_id_idx" ON "robots" USING btree ("manufacturer_id");
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "degrees_of_freedom" integer;
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "price_usd" integer;
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "price_note" text;
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "purchase_url" text;
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "us_availability" text;
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "class" "competition_class" DEFAULT 'humanoid' NOT NULL;
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "source_url" text;
--> statement-breakpoint
ALTER TABLE "robots" ADD COLUMN IF NOT EXISTS "confidence" "confidence" DEFAULT 'reported' NOT NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------- bouts ----
ALTER TABLE "bouts" ADD COLUMN IF NOT EXISTS "pilot_a_id" integer;
--> statement-breakpoint
ALTER TABLE "bouts" ADD COLUMN IF NOT EXISTS "pilot_b_id" integer;
--> statement-breakpoint
ALTER TABLE "bouts" DROP CONSTRAINT IF EXISTS "bouts_pilot_a_id_pilots_id_fk";
--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_pilot_a_id_pilots_id_fk"
  FOREIGN KEY ("pilot_a_id") REFERENCES "public"."pilots"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "bouts" DROP CONSTRAINT IF EXISTS "bouts_pilot_b_id_pilots_id_fk";
--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_pilot_b_id_pilots_id_fk"
  FOREIGN KEY ("pilot_b_id") REFERENCES "public"."pilots"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- --------------------------------------------------------- bout results ----
ALTER TABLE "bout_results" ADD COLUMN IF NOT EXISTS "confidence" "confidence" DEFAULT 'reported' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bout_results" ADD COLUMN IF NOT EXISTS "source_url" text;
--> statement-breakpoint

-- ---------------------------------------------------------------- posts ----
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "evergreen" boolean DEFAULT false NOT NULL;
