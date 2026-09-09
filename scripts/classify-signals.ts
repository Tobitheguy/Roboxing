import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Run stage 2 of the watcher by hand.
 *
 * The cron does this every morning after the sweep. This exists for the two
 * cases the cron cannot serve: backfilling rows that were swept before the
 * classifier existed, and seeing the effect of a prompt change without waiting
 * until 05:30 UTC.
 *
 * It spends real money — roughly $0.05 per 200 items on Haiku 4.5 — and it is
 * bounded by the same SIGNALS_CLASSIFY_LIMIT as the cron.
 *
 * Usage: npm run signals:classify
 */
async function main() {
  /*
   * Imported dynamically, AFTER dotenv has run. `src/db` builds its Neon client
   * from DATABASE_URL at module scope, and a static import would be hoisted
   * above the config() calls above — leaving the client with no connection
   * string on a machine where the variable is only in .env.local.
   */
  const { classifySignals } = await import("../src/lib/classify");
  const { db } = await import("../src/db");
  const { signals } = await import("../src/db/schema");
  const { desc, isNotNull, sql } = await import("drizzle-orm");

  const result = await classifySignals((message) => console.log(message));
  console.log("classify:", result);

  // Read the rows back rather than trusting the return value. The counter says
  // what the code believed it wrote; this says what the database actually has.
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      scored: sql<number>`count(${signals.classifiedAt})::int`,
    })
    .from(signals);
  console.log("rows:", counts);

  const top = await db
    .select({
      score: signals.score,
      category: signals.category,
      language: signals.language,
      summary: signals.summary,
    })
    .from(signals)
    .where(isNotNull(signals.classifiedAt))
    .orderBy(desc(signals.score))
    .limit(8);

  console.log("\ntop signals:");
  for (const row of top) {
    console.log(
      `  ${String(row.score).padStart(3)} [${row.language}/${row.category}] ${row.summary}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
