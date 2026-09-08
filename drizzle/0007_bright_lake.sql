CREATE TYPE "public"."post_kind" AS ENUM('clip', 'article');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" "post_kind" DEFAULT 'clip' NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text,
	"embed_url" text,
	"cover_image_url" text,
	"event_id" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_status_published_at_idx" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "posts_event_id_idx" ON "posts" USING btree ("event_id");