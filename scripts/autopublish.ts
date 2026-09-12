import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Run stage 3 of the watcher by hand.
 *
 * Two modes, and the default is the safe one:
 *
 *   npm run signals:publish -- --dry    fetch, read, write the brief, print it,
 *                                       and touch nothing
 *   npm run signals:publish             publish for real
 *
 * The dry run exists because the live run puts writing on a public site with no
 * human in between. Anything about the prompt, the score threshold or the
 * fetcher should be judged on a printed brief first — the cost of reading one
 * is a cent, and the cost of not reading one is a wrong story with our name on
 * it.
 *
 * The dry run performs every step the real one does INCLUDING the model call
 * and its bill. It stops at the INSERT.
 *
 * Usage:
 *   npm run signals:publish -- --dry
 *   AUTOPUBLISH=on npm run signals:publish
 */
async function main() {
  const dry = process.argv.includes("--dry");

  /*
   * Dynamic import, AFTER dotenv — src/db builds its Neon client from
   * DATABASE_URL at module scope, and a static import gets hoisted above the
   * config() calls above. Same reason as scripts/classify-signals.ts.
   */
  const { autoPublish, dryRunAutoPublish } = await import(
    "../src/lib/autopublish"
  );

  if (dry) {
    // The gate is the cron's business, not the operator's: someone typing
    // --dry has asked for exactly one run and is watching it.
    process.env.AUTOPUBLISH = "on";
    const briefs = await dryRunAutoPublish((message) => console.log(message));
    for (const entry of briefs) {
      console.log("\n" + "=".repeat(72));
      console.log(`SIGNAL ${entry.signalId}  score ${entry.score}  ${entry.url}`);
      console.log("=".repeat(72));
      if (!entry.brief) {
        console.log(`NOT PUBLISHED — ${entry.reason}`);
        continue;
      }
      console.log(`WOULD PUBLISH as /news/${entry.slug}\n`);
      console.log(`TITLE:   ${entry.brief.title}`);
      console.log(`SUMMARY: ${entry.brief.summary}\n`);
      console.log(entry.body);
    }
    console.log(`\n${briefs.length} candidate(s) examined, nothing written.`);
    return;
  }

  const result = await autoPublish((message) => console.log(message));
  console.log("publishing:", JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
