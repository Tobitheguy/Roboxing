CREATE TYPE "public"."entitlement_kind" AS ENUM('subscription', 'ppv', 'complimentary');--> statement-breakpoint
CREATE TYPE "public"."event_access" AS ENUM('free', 'subscription');--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" "entitlement_kind" DEFAULT 'subscription' NOT NULL,
	"event_id" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"stripe_ref" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_window_ordered" CHECK ("entitlements"."ends_at" IS NULL OR "entitlements"."ends_at" > "entitlements"."starts_at"),
	CONSTRAINT "entitlements_event_matches_kind" CHECK (("entitlements"."kind" = 'ppv' AND "entitlements"."event_id" IS NOT NULL)
          OR ("entitlements"."kind" <> 'ppv'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "access" "event_access" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entitlements_user_id_idx" ON "entitlements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entitlements_event_id_idx" ON "entitlements" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");