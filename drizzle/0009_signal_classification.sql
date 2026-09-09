-- Stage 2 of the watcher: what the classifier makes of each swept signal.
--
-- Hand-written and applied with
--   npx tsx scripts/apply-migration.ts drizzle/0009_signal_classification.sql
-- NOT with `drizzle-kit push`. Push is unsafe against this database: it has
-- drifted from the migration history (it is missing bouts_event_order_unique)
-- and offers to TRUNCATE `bouts` to reconcile.
--
-- The breakpoint markers between statements below are load-bearing, not
-- decoration: the apply script splits the file on them, and Neon's HTTP driver
-- rejects a multi-statement string. A file without them is sent as a single
-- statement and fails with 42601. For the same reason, never write that marker
-- inside a comment here — the splitter does not know it is quoted.
--
-- Every statement is idempotent, so a partial application can be re-run.
--
-- All four columns are nullable and start null. That is deliberate:
-- `classified_at IS NULL` IS the work queue, so a row the classifier has never
-- seen and a row whose chunk failed mid-run look identical and are both picked
-- up by the next sweep. There is no separate failure column to keep in sync.

ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "score" integer;
--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "category" text;
--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "summary" text;
--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "classified_at" timestamp with time zone;
--> statement-breakpoint
-- The model is what needs constraining, not the caller. The code clamps too;
-- this is the backstop that survives a prompt rewrite or a model swap that
-- starts emitting 0-10 or 0-1 instead of 0-100.
ALTER TABLE "signals" DROP CONSTRAINT IF EXISTS "signals_score_range";
--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_score_range"
  CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100));
--> statement-breakpoint
-- The inbox query after stage 2: new items, best first.
CREATE INDEX IF NOT EXISTS "signals_status_score_idx" ON "signals" ("status", "score");
