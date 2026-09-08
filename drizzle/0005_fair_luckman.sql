CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"unsubscribe_token" text DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "start_time_tbd" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "broadcast_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "broadcast_name" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "source_url" text;--> statement-breakpoint
CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");