import { db } from "@/db";
import { signals } from "@/db/schema";

/**
 * The watcher: what it reads, and how.
 *
 * No "server-only" marker, deliberately: parseFeed() is a pure function the
 * tests import directly, and server-only throws on any import outside an RSC
 * context — which silently failed the whole test file. The db-touching sweep
 * is only ever called from the cron route.
 *
 * Stage 1 of the editorial pipeline — collection only. Every source here is a
 * plain RSS/Atom feed fetched with no API key, because keyless sources cannot
 * be revoked, rate-negotiated or invoiced. The Chinese-language sweep is not
 * decoration: the site's first verified result existed ONLY in Chinese media
 * for two months, and this feed is how the next one gets caught the morning
 * it appears rather than by accident.
 *
 * On WeChat, honestly: there is no readable API. WeChat official accounts are
 * a closed ecosystem — publishing requires a Chinese entity, and reading has
 * no public interface at all. But the same stories WeChat accounts carry are
 * carried by the open Chinese web (People's Daily, Sina, ZAKER, local city
 * media), and Google News's zh-CN index sweeps those. That is the honest way
 * in, and it is the one that already worked once.
 *
 * Adding a source is adding a row to SOURCES. YouTube channels take
 * `https://www.youtube.com/feeds/videos.xml?channel_id=UC...` (find the id in
 * the channel page source); Bilibili users work via an RSSHub instance,
 * `https://rsshub.app/bilibili/user/video/{uid}`.
 */

export type SignalSource = {
  /** Stable identifier stored on each row, e.g. "google-news-en". */
  id: string;
  url: string;
  kind: "news" | "video";
  language: "en" | "zh";
};

const GOOGLE_NEWS_EN =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent(
    '"humanoid robot" (fight OR boxing OR kickboxing OR combat OR URKL OR CyberHero)',
  ) +
  "&hl=en-US&gl=US&ceid=US:en";

const GOOGLE_NEWS_ZH =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("人形机器人 格斗 OR 机器人格斗 OR 机甲格斗") +
  "&hl=zh-CN&gl=CN&ceid=CN:zh-Hans";

export const SOURCES: SignalSource[] = [
  { id: "google-news-en", url: GOOGLE_NEWS_EN, kind: "news", language: "en" },
  { id: "google-news-zh", url: GOOGLE_NEWS_ZH, kind: "news", language: "zh" },
  // YouTube channel feeds and Bilibili/RSSHub slots get added here as their
  // channel ids are collected — same shape, zero code.
];

export type FeedItem = {
  title: string;
  url: string;
  publishedAt: Date | null;
};

/** Strip CDATA wrappers and decode the handful of entities RSS titles use. */
function cleanText(raw: string): string {
  return raw
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

/**
 * Parse RSS 2.0 and Atom with regexes.
 *
 * Deliberately not an XML library: the two feed dialects Google News and
 * YouTube emit are flat and stable, a real parser is a dependency with its
 * own CVE history, and this function is pure — the tests feed it captured
 * fixtures. If a future source emits something these patterns miss, the fix
 * is a fixture plus a pattern, visible in the diff.
 */
export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];

  // RSS 2.0: <item><title>…</title><link>…</link><pubDate>…</pubDate>
  for (const match of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const block = match[0];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1];
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1];
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    if (!title || !link) continue;
    const when = pubDate ? new Date(pubDate) : null;
    items.push({
      title: cleanText(title),
      url: cleanText(link),
      publishedAt: when && !Number.isNaN(when.getTime()) ? when : null,
    });
  }
  if (items.length > 0) return items;

  // Atom (YouTube): <entry><title>…</title><link href="…"/><published>…
  for (const match of xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/g)) {
    const block = match[0];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1];
    const href = block.match(/<link[^>]*href="([^"]+)"/)?.[1];
    const published = block.match(/<published>([\s\S]*?)<\/published>/)?.[1];
    if (!title || !href) continue;
    const when = published ? new Date(published) : null;
    items.push({
      title: cleanText(title),
      url: cleanText(href),
      publishedAt: when && !Number.isNaN(when.getTime()) ? when : null,
    });
  }
  return items;
}

export type SweepResult = {
  source: string;
  fetched: number;
  inserted: number;
  error?: string;
};

/**
 * Run every source and land what is new.
 *
 * `onConflictDoNothing` on the URL is the dedupe: the same story on day two
 * inserts zero rows. A failing source reports its error and does NOT abort
 * the sweep — one dead feed must not cost the morning's other sources.
 */
export async function sweepSignals(): Promise<SweepResult[]> {
  const results: SweepResult[] = [];

  for (const source of SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: { "user-agent": "roboxing-watcher/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        results.push({
          source: source.id,
          fetched: 0,
          inserted: 0,
          error: `HTTP ${response.status}`,
        });
        continue;
      }

      const items = parseFeed(await response.text());
      let inserted = 0;
      for (const item of items) {
        const rows = await db
          .insert(signals)
          .values({
            source: source.id,
            kind: source.kind,
            language: source.language,
            title: item.title.slice(0, 500),
            url: item.url.slice(0, 1000),
            publishedAt: item.publishedAt,
          })
          .onConflictDoNothing({ target: signals.url })
          .returning({ id: signals.id });
        inserted += rows.length;
      }
      results.push({ source: source.id, fetched: items.length, inserted });
    } catch (error) {
      results.push({
        source: source.id,
        fetched: 0,
        inserted: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
