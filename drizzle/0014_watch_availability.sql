-- Whether a channel's footage can actually be watched.
--
-- Applied with
--   npx tsx scripts/apply-migration.ts drizzle/0014_watch_availability.sql
--
-- DIR_03's watch layer needs five states and only two of them are derivable
-- from the URL. `geo_locked`, `vod_removed` and `never_published` are facts
-- somebody has to establish and record -- and `vod_removed` is the one that
-- makes the page worth more than a links list, because a stream that has been
-- taken down STAYS LISTED. Its absence is part of the record.
--
-- Nullable on purpose: null means nobody has checked yet, which is a different
-- claim from "link only" and must not be rendered as one.

DO $$ BEGIN
  CREATE TYPE "watch_availability" AS ENUM ('embedded', 'link_only', 'geo_locked', 'vod_removed', 'never_published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

ALTER TABLE "watch_channels" ADD COLUMN IF NOT EXISTS "availability" "watch_availability";
