-- Everything the newsletter needs before a single mail can leave the building.
--
-- Applied with
--   npx tsx scripts/apply-migration.ts drizzle/0010_newsletter_sending.sql
-- and NOT with `drizzle-kit push` (see 0009 for why). The breakpoint markers
-- between statements are required by the apply script; never write that marker
-- inside a comment, because the splitter does not know it is quoted.

-- A confirm token distinct from the unsubscribe token. Sharing one would make
-- the unsubscribe link at the foot of every mail a working confirm link too.
--
-- gen_random_uuid() is volatile, so Postgres evaluates it per row rather than
-- once for the whole table -- every existing subscriber gets its own value and
-- the UNIQUE holds. (Today there are zero rows, but that is luck, not design.)
ALTER TABLE "subscribers"
  ADD COLUMN IF NOT EXISTS "confirm_token" text NOT NULL DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "subscribers" DROP CONSTRAINT IF EXISTS "subscribers_confirm_token_unique";
--> statement-breakpoint
ALTER TABLE "subscribers"
  ADD CONSTRAINT "subscribers_confirm_token_unique" UNIQUE ("confirm_token");
--> statement-breakpoint
-- One row per mail-out. `key` is the idempotency claim, not a label: the send
-- path inserts it first and only mails if the insert won, so a cron that fires
-- twice still mails once.
CREATE TABLE IF NOT EXISTS "newsletter_sends" (
  "id" serial PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "kind" text NOT NULL,
  "subject" text NOT NULL,
  "recipient_count" integer NOT NULL DEFAULT 0,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
