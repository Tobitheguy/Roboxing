import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import { events, streams } from "../src/db/schema";

/**
 * Point an event's player at a plain HLS manifest.
 *
 * Exists so the player can be verified end to end without a Cloudflare Stream
 * subscription — there is no point paying to store video when there is nothing
 * yet to broadcast. It is not throwaway scaffolding either: if a rights holder
 * hands over an HLS URL rather than an RTMP feed to restream, this is the same
 * code path.
 *
 *   npm run set-test-stream -- <event-slug> <hls-url>
 *   npm run set-test-stream -- <event-slug> --clear
 */

/**
 * Apple's public multi-bitrate HLS sample. Chosen because it advertises
 * several renditions, which is what actually exercises the quality selector
 * and hls.js's level switching — a single-rendition stream would let a broken
 * menu look fine.
 */
const DEFAULT_TEST_STREAM =
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8";

async function main() {
  const [slug, urlArg] = process.argv.slice(2);

  if (!slug) {
    console.error(
      "Usage: npm run set-test-stream -- <event-slug> [hls-url|--clear]",
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const db = drizzle(neon(url));

  const eventRows = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);

  const event = eventRows[0];
  if (!event) {
    console.error(`No event with slug "${slug}".`);
    process.exit(1);
  }

  const clearing = urlArg === "--clear";
  const manifest = clearing ? null : (urlArg ?? DEFAULT_TEST_STREAM);

  const existing = await db
    .select({ id: streams.id })
    .from(streams)
    .where(eq(streams.eventId, event.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(streams)
      .set({ cfPlaybackHlsUrl: manifest })
      .where(eq(streams.id, existing[0].id));
  } else {
    await db.insert(streams).values({
      eventId: event.id,
      cfPlaybackHlsUrl: manifest,
      status: "idle",
    });
  }

  console.log(
    clearing
      ? `Cleared the manifest on "${event.name}".`
      : `"${event.name}" now plays:\n  ${manifest}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
