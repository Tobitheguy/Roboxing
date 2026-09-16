import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Read-only look at the triage inbox. Writes nothing, spends nothing.
 *
 * Exists because dismissing is permanent — the unique URL is the dedupe key, so
 * a dismissed row can never resurface — and 240 untouched rows is too many to
 * judge one at a time in a browser.
 *
 * Usage: npx tsx scripts/signals-report.ts [minScore]
 */
async function main() {
  // Dynamic import AFTER dotenv, for the reason spelled out in
  // scripts/classify-signals.ts: src/db reads DATABASE_URL at module scope.
  const { db } = await import("../src/db");
  const { signals } = await import("../src/db/schema");
  const { sql, desc, and, eq, gte, isNotNull } = await import("drizzle-orm");

  const minScore = Number(process.argv[2] ?? 70);

  const byStatus = await db
    .select({ status: signals.status, n: sql<number>`count(*)::int` })
    .from(signals)
    .groupBy(signals.status);
  console.log("\n=== BY STATUS ===");
  console.table(byStatus);

  const unscored = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(signals)
    .where(sql`${signals.classifiedAt} is null`);
  console.log(`unscored rows: ${unscored[0]?.n ?? 0}`);

  const buckets = await db
    .select({
      bucket: sql<string>`case
        when ${signals.score} >= 85 then '85-100 (publishable)'
        when ${signals.score} >= 70 then '70-84  (priority)'
        when ${signals.score} >= 40 then '40-69  (adjacent)'
        else '0-39   (noise)' end`,
      n: sql<number>`count(*)::int`,
    })
    .from(signals)
    .where(isNotNull(signals.score))
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`);
  console.log("\n=== BY SCORE BUCKET ===");
  console.table(buckets);

  const byCategory = await db
    .select({ category: signals.category, n: sql<number>`count(*)::int` })
    .from(signals)
    .where(isNotNull(signals.category))
    .groupBy(signals.category)
    .orderBy(desc(sql`count(*)`));
  console.log("\n=== BY CATEGORY ===");
  console.table(byCategory);

  /*
   * How many high scorers are Google News interstitials. Stage 3 can never
   * publish from those — the publisher URL is not in the page — so a big number
   * here is the explanation for a quiet morning, not a broken watcher.
   */
  const fetchability = await db
    .select({
      fetchable: sql<string>`case when ${signals.url} like '%news.google.com%'
        then 'google-news (unpublishable)' else 'real publisher' end`,
      n: sql<number>`count(*)::int`,
    })
    .from(signals)
    .where(and(eq(signals.status, "new"), gte(signals.score, minScore)))
    .groupBy(sql`1`);
  console.log(`\n=== NEW ROWS SCORING >= ${minScore}: FETCHABILITY ===`);
  console.table(fetchability);

  const top = await db
    .select({
      id: signals.id,
      score: signals.score,
      category: signals.category,
      lang: signals.language,
      source: signals.source,
      title: signals.title,
      summary: signals.summary,
      url: signals.url,
      publishedAt: signals.publishedAt,
    })
    .from(signals)
    .where(and(eq(signals.status, "new"), gte(signals.score, minScore)))
    .orderBy(desc(signals.score), desc(signals.publishedAt))
    .limit(60);

  console.log(`\n=== TOP NEW SIGNALS (score >= ${minScore}) — ${top.length} shown ===`);
  for (const row of top) {
    const date = row.publishedAt
      ? new Date(row.publishedAt).toISOString().slice(0, 10)
      : "no-date";
    const google = row.url.includes("news.google.com") ? " [GNEWS]" : "";
    console.log(
      `\n#${row.id} ${row.score} ${row.category ?? "-"} ${row.lang ?? "-"} ${date}${google}`,
    );
    console.log(`  ${row.title}`);
    if (row.summary) console.log(`  → ${row.summary}`);
    console.log(`  ${row.url.slice(0, 120)}`);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
