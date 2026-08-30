-- Capture the teams a bout was fought between, at the time it was fought.
--
-- Hand-edited from the generated version, which emitted a bare
-- `ADD COLUMN ... NOT NULL` and would have aborted against any table that
-- already has rows. Added nullable, backfilled from each robot's current team
-- (correct exactly once — before any transfer has happened), then constrained.
ALTER TABLE "bouts" ADD COLUMN "team_a_id" integer;--> statement-breakpoint
ALTER TABLE "bouts" ADD COLUMN "team_b_id" integer;--> statement-breakpoint

UPDATE "bouts" SET "team_a_id" = "robots"."team_id"
  FROM "robots" WHERE "robots"."id" = "bouts"."robot_a_id";--> statement-breakpoint
UPDATE "bouts" SET "team_b_id" = "robots"."team_id"
  FROM "robots" WHERE "robots"."id" = "bouts"."robot_b_id";--> statement-breakpoint

ALTER TABLE "bouts" ALTER COLUMN "team_a_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bouts" ALTER COLUMN "team_b_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "bouts" ADD CONSTRAINT "bouts_team_a_id_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_team_b_id_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bouts_robot_a_id_idx" ON "bouts" USING btree ("robot_a_id");--> statement-breakpoint
CREATE INDEX "bouts_robot_b_id_idx" ON "bouts" USING btree ("robot_b_id");--> statement-breakpoint
ALTER TABLE "points_rules" ADD CONSTRAINT "points_rules_non_negative" CHECK ("points_rules"."win_points" >= 0 AND "points_rules"."draw_points" >= 0 AND "points_rules"."loss_points" >= 0 AND "points_rules"."ko_bonus_points" >= 0);
