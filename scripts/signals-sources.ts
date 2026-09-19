/**
 * Fetch every configured source and report what it returns. Touches no
 * database, spends nothing, inserts nothing.
 *
 * Exists because a feed that returns zero looks exactly like a quiet news
 * morning. Most of the sources added in the Malaysia pass are queries written
 * in languages nobody here reads — a typo in the Korean or a wrong `ceid`
 * produces an empty feed forever and no error anywhere. This is the check that
 * makes that visible, and it is the one to run after editing any query.
 *
 * Usage: npm run signals:sources
 */
import { parseFeed, SOURCES, filterItems } from "../src/lib/signals";

async function main() {
  const rows: Record<string, unknown>[] = [];

  for (const source of SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: { "user-agent": "roboxing-watcher/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        rows.push({
          id: source.id,
          lang: source.language,
          items: 0,
          kept: 0,
          status: `HTTP ${response.status}`,
        });
        continue;
      }
      const all = parseFeed(await response.text());
      const kept = filterItems(all, source.match);
      rows.push({
        id: source.id,
        lang: source.language,
        items: all.length,
        kept: kept.length,
        status: all.length === 0 ? "EMPTY — check the query" : "ok",
        sample: kept[0]?.title.slice(0, 60) ?? "",
      });
    } catch (error) {
      rows.push({
        id: source.id,
        lang: source.language,
        items: 0,
        kept: 0,
        status: error instanceof Error ? error.message : "failed",
      });
    }
  }

  console.table(rows);

  const dead = rows.filter((r) => r.items === 0);
  console.log(`\n${SOURCES.length} sources, ${dead.length} returning nothing.`);
  if (dead.length > 0) {
    console.log(
      "Empty is not always broken — a watchlist feed is empty on a slow week.\n" +
        "Empty EVERY day is a broken query. Check these first: " +
        dead.map((r) => r.id).join(", "),
    );
  }
}

main();
