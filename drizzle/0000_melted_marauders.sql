CREATE TYPE "public"."bout_method" AS ENUM('ko', 'tko', 'decision', 'draw', 'dq', 'no_contest');--> statement-breakpoint
CREATE TYPE "public"."bout_status" AS ENUM('scheduled', 'live', 'completed');--> statement-breakpoint
CREATE TYPE "public"."competition_status" AS ENUM('upcoming', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'live', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stream_status" AS ENUM('idle', 'live', 'ended');--> statement-breakpoint
CREATE TABLE "admin_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_email" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"payload_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bout_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"bout_id" integer NOT NULL,
	"winner_robot_id" integer,
	"method" "bout_method" NOT NULL,
	"end_round" integer,
	"end_time_seconds" integer,
	"knockdowns_a" integer DEFAULT 0 NOT NULL,
	"knockdowns_b" integer DEFAULT 0 NOT NULL,
	"stats_json" jsonb,
	"notes" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bout_results_bout_id_unique" UNIQUE("bout_id"),
	CONSTRAINT "bout_results_winner_matches_method" CHECK (("bout_results"."method" IN ('draw','no_contest') AND "bout_results"."winner_robot_id" IS NULL)
          OR ("bout_results"."method" NOT IN ('draw','no_contest') AND "bout_results"."winner_robot_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "bouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"competition_id" integer NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"robot_a_id" integer NOT NULL,
	"robot_b_id" integer NOT NULL,
	"scheduled_rounds" integer DEFAULT 3 NOT NULL,
	"status" "bout_status" DEFAULT 'scheduled' NOT NULL,
	"started_at" timestamp with time zone,
	CONSTRAINT "bouts_event_order_unique" UNIQUE("event_id","order_index"),
	CONSTRAINT "bouts_distinct_robots" CHECK ("bouts"."robot_a_id" <> "bouts"."robot_b_id")
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"organizer" text,
	"season_year" integer,
	"status" "competition_status" DEFAULT 'upcoming' NOT NULL,
	"description" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"competition_id" integer NOT NULL,
	"name" text NOT NULL,
	"venue" text,
	"city" text,
	"country" text,
	"starts_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"status" "event_status" DEFAULT 'scheduled' NOT NULL,
	"poster_url" text,
	"allowed_countries" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "points_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_id" integer NOT NULL,
	"win_points" integer DEFAULT 3 NOT NULL,
	"draw_points" integer DEFAULT 1 NOT NULL,
	"loss_points" integer DEFAULT 0 NOT NULL,
	"ko_bonus_points" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "points_rules_competition_id_unique" UNIQUE("competition_id")
);
--> statement-breakpoint
CREATE TABLE "robots" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"team_id" integer NOT NULL,
	"name" text NOT NULL,
	"model" text,
	"weight_class" text,
	"photo_url" text,
	"height_cm" integer,
	"weight_grams" integer,
	"specs_json" jsonb,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robots_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"cf_live_input_id" text,
	"cf_playback_hls_url" text,
	"cf_rtmp_url" text,
	"cf_stream_key_ref" text,
	"cf_recording_uid" text,
	"status" "stream_status" DEFAULT 'idle' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"org_name" text,
	"logo_url" text,
	"bio" text,
	"founded_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "bout_results" ADD CONSTRAINT "bout_results_bout_id_bouts_id_fk" FOREIGN KEY ("bout_id") REFERENCES "public"."bouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bout_results" ADD CONSTRAINT "bout_results_winner_robot_id_robots_id_fk" FOREIGN KEY ("winner_robot_id") REFERENCES "public"."robots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_robot_a_id_robots_id_fk" FOREIGN KEY ("robot_a_id") REFERENCES "public"."robots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_robot_b_id_robots_id_fk" FOREIGN KEY ("robot_b_id") REFERENCES "public"."robots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_rules" ADD CONSTRAINT "points_rules_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "robots" ADD CONSTRAINT "robots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_created_at_idx" ON "admin_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bout_results_winner_idx" ON "bout_results" USING btree ("winner_robot_id");--> statement-breakpoint
CREATE INDEX "bouts_event_id_idx" ON "bouts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "bouts_competition_id_idx" ON "bouts" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "events_competition_id_idx" ON "events" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "robots_team_id_idx" ON "robots" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "streams_event_id_unique" ON "streams" USING btree ("event_id");