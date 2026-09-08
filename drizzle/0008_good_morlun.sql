CREATE TABLE "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"kind" text DEFAULT 'news' NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp with time zone,
	"language" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signals_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE INDEX "signals_status_created_idx" ON "signals" USING btree ("status","created_at");