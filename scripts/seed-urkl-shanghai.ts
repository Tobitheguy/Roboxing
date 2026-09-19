import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * URKL City Tour Challenge — Shanghai. The one that got away on the night.
 *
 * WHAT HAPPENED, recorded here because it is the most useful thing in this
 * file. The watcher DID catch this. Signal 3765 was swept from bing-news-zh on
 * 15 September, scored 85 — at the auto-publish threshold — categorised
 * `event`, with a fetchable news.qq.com URL rather than a Google interstitial.
 * Everything the pipeline is built to do, it did.
 *
 * The row was then DISMISSED, and dismissal is permanent by design: the URL is
 * the dedupe key, so the story could never resurface, and stage 3 skips
 * anything not `new`. The admin audit table holds nine rows and not one of them
 * concerns a signal, so there is no record of who dismissed it or when. That is
 * a second bug and it is worse than the first — a triage decision that cannot
 * be traced is a triage decision that cannot be reviewed.
 *
 * So the lesson is not "widen the net" this time. The net worked. What failed
 * was after the net.
 *
 * Idempotent: upsert keyed on slug.
 *
 * Usage: npm run db:seed-urkl-shanghai
 */

const QQ_PREVIEW = "https://news.qq.com/rain/a/20260915A062KE00";
const QQ_OPENING = "https://news.qq.com/rain/a/20260919V0AVAW00";

async function main() {
  const { db } = await import("../src/db");
  const { competitions, events, signals } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const urkl = (
    await db
      .select({ id: competitions.id })
      .from(competitions)
      .where(eq(competitions.slug, "urkl"))
  )[0];
  if (!urkl) throw new Error("URKL competition row is missing");

  const event = {
    slug: "urkl-shanghai-baoshan-2026",
    competitionId: urkl.id,
    name: "URKL City Tour Challenge — Shanghai",
    venue: "Baoshan Gymnasium (宝山体育馆)",
    city: "Shanghai",
    country: "CN",
    /*
     * "9月19日晚" — the evening of 19 September. The hour is ours, not theirs,
     * so startTimeTbd says so and the page prints the date alone. 11:00 UTC is
     * 19:00 in Shanghai, which is where the instant comes from; it exists to
     * sort the calendar, not to be read as an announcement.
     */
    startsAt: new Date("2026-09-19T11:00:00Z"),
    startTimeTbd: true,
    timezone: "Asia/Shanghai",
    status: "completed" as const,
    kind: "competition" as const,
    access: "free" as const,
    confidence: "confirmed" as const,
    sourceUrl: QQ_OPENING,
    note: "Second stop of the city tour after the Shenzhen opener in July. 5,000 tickets sold out. Every team fights an identical EngineAI T800, so the result is algorithm and strategy rather than hardware; 1v1, and a machine that cannot stand within 10 seconds of going down loses. 32 teams competing for finals places, with a gold championship belt for the winner. Hosted by the Baoshan District People's Government and staged by EngineAI's Shanghai entity. No result published at the time of writing.",
  };

  await db
    .insert(events)
    .values(event)
    .onConflictDoUpdate({ target: events.slug, set: event });

  /*
   * Mark the signal as what it actually became. It was dismissed; it was a
   * real fixture. `kept` is the honest end state and it also makes the row
   * findable again, which `dismissed` does not.
   */
  await db.update(signals).set({ status: "kept" }).where(eq(signals.id, 3765));

  console.log(`Seeded ${event.slug} under URKL (competition ${urkl.id}).`);
  console.log(`Preview source: ${QQ_PREVIEW}`);
  console.log("Signal 3765 moved from dismissed to kept.");
  process.exit(0);
}

main();
