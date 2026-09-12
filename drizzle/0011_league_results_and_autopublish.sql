-- Two unrelated gaps, one migration, because both are additive nullable
-- columns and neither can fail:
--
--   1. A result the site KNOWS but cannot store. `bouts` requires two named
--      robots; CyberHero's first event was a team best-of-seven whose machines
--      were never named by anyone. `events.results_summary` holds the prose so
--      the league page can stop claiming we don't know.
--
--   2. The morning cron can now publish. `posts.auto_published` is the standing
--      disclosure on anything it wrote, `posts.source_url` is what it wrote
--      from, and `signals.post_id` is the idempotency guard that stops the same
--      story going up twice.
--
-- Applied with
--   npx tsx scripts/apply-migration.ts drizzle/0011_league_results_and_autopublish.sql
-- and NOT with `drizzle-kit push` (see 0009 for why -- the live database has
-- drifted from the journal and push offers to TRUNCATE to reconcile it).
--
-- Every statement is IF NOT EXISTS, so a re-run is a no-op rather than an
-- error. Worth it: the only way to know this ran against production is to run
-- it, and a migration that punishes a second attempt makes that check costly.

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "results_summary" text;
--> statement-breakpoint

-- NOT NULL with a default, not nullable: a post whose provenance is unknown is
-- a post a reader cannot place, and there is no third state between "a person
-- wrote this" and "the cron did". Every existing row is hand-written, which is
-- what false means.
ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "auto_published" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "source_url" text;
--> statement-breakpoint

ALTER TABLE "signals"
  ADD COLUMN IF NOT EXISTS "post_id" integer;
--> statement-breakpoint

-- ON DELETE SET NULL, deliberately not CASCADE. Deleting a bad brief must not
-- delete the signal that produced it: the signal is the record that we already
-- saw this story, and without it the next morning's run finds the same headline
-- and publishes it again -- which is precisely the moment a retry is least
-- wanted.
ALTER TABLE "signals" DROP CONSTRAINT IF EXISTS "signals_post_id_posts_id_fk";
--> statement-breakpoint

ALTER TABLE "signals"
  ADD CONSTRAINT "signals_post_id_posts_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- The auto-publisher's candidate query is "scored high, never published",
-- which is this index. Without it the run sequentially scans every signal ever
-- collected, and that table only grows.
CREATE INDEX IF NOT EXISTS "signals_post_id_score_idx"
  ON "signals" USING btree ("post_id", "score");
