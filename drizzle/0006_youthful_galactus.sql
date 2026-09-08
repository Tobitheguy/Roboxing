CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bout_id" integer NOT NULL,
	"robot_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_user_bout_unique" UNIQUE("user_id","bout_id")
);
--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_bout_id_bouts_id_fk" FOREIGN KEY ("bout_id") REFERENCES "public"."bouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_robot_id_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "public"."robots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "predictions_bout_id_idx" ON "predictions" USING btree ("bout_id");--> statement-breakpoint
CREATE INDEX "predictions_user_id_idx" ON "predictions" USING btree ("user_id");