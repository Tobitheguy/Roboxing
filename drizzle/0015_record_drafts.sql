-- Stage 4: leagues and events the watcher proposes, waiting for a human.
--
-- Hand-written rather than generated, for the reason in scripts/apply-migration.ts:
-- the live database has drifted from the schema file, so drizzle-kit would offer
-- to "fix" unrelated constraints — including a TRUNCATE on bouts. This file adds
-- one table and two enums and touches nothing else.

CREATE TYPE "public"."draft_kind" AS ENUM('competition', 'event');
--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('pending', 'applied', 'dismissed');
--> statement-breakpoint
CREATE TABLE "record_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"signal_id" integer NOT NULL,
	"kind" "draft_kind" NOT NULL,
	"status" "draft_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"rationale" text,
	"source_url" text NOT NULL,
	"model" text,
	"applied_slug" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "record_drafts_signal_id_unique" UNIQUE("signal_id")
);
--> statement-breakpoint
ALTER TABLE "record_drafts" ADD CONSTRAINT "record_drafts_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "record_drafts_status_idx" ON "record_drafts" USING btree ("status","created_at");
