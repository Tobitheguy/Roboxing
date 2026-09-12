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
  /**
   * True when the feed IS a query, so its items are pre-scoped.
   *
   * Exists to be asserted on: a publisher feed added without a `match` filter
   * silently sends a whole newsroom's daily output to the paid classifier, and
   * the test that catches that needs to know which sources are legitimately
   * unfiltered rather than inferring it from the id.
   */
  search?: true;
  /**
   * Title filter, for feeds that are not already a search.
   *
   * A Google News source IS its query, so it arrives pre-scoped. A publisher's
   * own feed is everything they published today — New Atlas alone is 60 items
   * of motorcycles and telescopes. Without a filter those rows land in the
   * inbox and then go to the classifier, which is the one stage that costs
   * money per row; the filter is what keeps a dozen publisher feeds from
   * multiplying the daily bill by ten to find the same handful of stories.
   *
   * Titles only, deliberately. It is a coarse net on purpose — the classifier
   * is the judge of relevance, and this just stops it being handed the obvious
   * no. A story whose headline mentions neither robots nor fighting is one we
   * would rather miss here than pay to reject every morning.
   */
  match?: RegExp;
};

/**
 * The net for publisher feeds. Anything a humanoid-fight story is likely to
 * say in its headline, and little else.
 *
 * Two groups joined by AND would be stricter and wrong: "Unitree G1 spars
 * autonomously" names no fight word, and "EngineAI T800 enters the octagon"
 * names no robot word. Either group alone is enough to be worth scoring.
 */
export const RELEVANT_TITLE =
  /\b(robot|robots|robotic|humanoid|humanoids|android|unitree|engineai|agibot|booster|cyberhero|urkl|\bREK\b|battlebots|mech|mecha)\b|\b(fight|fights|fighting|boxing|kickbox|kickboxing|combat|bout|bouts|brawl|spar|sparring|knockout|octagon|ring|martial arts|mma|ufc|wrestl)/i;

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

/**
 * Why the publisher feeds below exist, when Google News already finds more.
 *
 * A Google News RSS `<link>` is not a link to the article. It is
 * `news.google.com/rss/articles/CBMi…`, which serves a 580 KB interstitial that
 * redirects in JavaScript — no Location header, and the publisher's URL appears
 * nowhere in the HTML (verified: the only non-Google URL in the page is
 * Angular's licence). Recovering it means an undocumented batchexecute RPC that
 * Google can change on any afternoon.
 *
 * Which is fine for discovery — a headline and a publisher name are all the
 * classifier needs to score a row, and that is what the inbox is for. It is
 * fatal for publishing: a brief written from a headline alone is a brief
 * written from nothing, and this site's only asset is being right.
 *
 * So the two jobs get two kinds of source. Google News stays as the wide net,
 * including the Chinese sweep that caught the first verified result two months
 * before anyone wrote about it in English. These feeds carry real URLs the
 * auto-publisher can actually fetch and read.
 */
const PUBLISHER_FEEDS: SignalSource[] = [
  {
    id: "the-robot-report",
    url: "https://www.therobotreport.com/feed/",
    kind: "news",
    language: "en",
    match: RELEVANT_TITLE,
  },
  {
    id: "interesting-engineering",
    url: "https://interestingengineering.com/feed",
    kind: "news",
    language: "en",
    match: RELEVANT_TITLE,
  },
  {
    id: "ieee-spectrum-robotics",
    url: "https://spectrum.ieee.org/feeds/topic/robotics.rss",
    kind: "news",
    language: "en",
    match: RELEVANT_TITLE,
  },
  {
    id: "techcrunch-robotics",
    url: "https://techcrunch.com/category/robotics/feed/",
    kind: "news",
    language: "en",
    match: RELEVANT_TITLE,
  },
  {
    id: "new-atlas",
    url: "https://newatlas.com/index.rss",
    kind: "news",
    language: "en",
    match: RELEVANT_TITLE,
  },
];

/**
 * The same searches on Bing, and the reason this file has two search engines in
 * it.
 *
 * Google News wins on recall — it is the only one of the two that indexes the
 * Chinese city media where the first verified result appeared — and it is
 * useless for anything but discovery, because its links are JS interstitials
 * (see PUBLISHER_FEEDS). Bing's news RSS carries the same stories a few hours
 * later behind an `apiclick.aspx?…&url=…` redirect whose target is RIGHT THERE
 * in the query string, no RPC and nothing to reverse-engineer.
 *
 * So Bing is what makes stage 3 possible at all. Without it the auto-publisher
 * can only see general robotics feeds, which on an ordinary day carry no
 * humanoid-fighting story whatsoever — verified: on 11 September the best
 * fetchable row scored 35, while six Google News rows scored 85 or higher.
 *
 * Both engines are kept because they fail differently. If Bing's redirect
 * format changes, discovery continues and only publishing stops.
 */
const BING_NEWS_EN =
  "https://www.bing.com/news/search?q=" +
  encodeURIComponent(
    '"humanoid robot" (fight OR boxing OR kickboxing OR combat OR CyberHero OR URKL)',
  ) +
  "&format=RSS";

const BING_NEWS_ZH =
  "https://www.bing.com/news/search?q=" +
  encodeURIComponent("人形机器人 格斗") +
  "&format=RSS&setlang=zh-hans";

export const SOURCES: SignalSource[] = [
  {
    id: "google-news-en",
    url: GOOGLE_NEWS_EN,
    kind: "news",
    language: "en",
    search: true,
  },
  {
    id: "google-news-zh",
    url: GOOGLE_NEWS_ZH,
    kind: "news",
    language: "zh",
    search: true,
  },
  {
    id: "bing-news-en",
    url: BING_NEWS_EN,
    kind: "news",
    language: "en",
    search: true,
  },
  {
    id: "bing-news-zh",
    url: BING_NEWS_ZH,
    kind: "news",
    language: "zh",
    search: true,
  },
  ...PUBLISHER_FEEDS,
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

/**
 * Turn a search engine's redirect into the publisher's own URL.
 *
 * Bing news RSS links look like
 *   http://www.bing.com/news/apiclick.aspx?ref=FexRss&tid=…&url=https%3A%2F%2F…
 * and the target is simply the `url` parameter. Unwrapping it at ingest rather
 * than at publish time means the stored row IS the article: the URL that the
 * unique index dedupes on, that the auto-publisher fetches, and that the inbox
 * links a human to. A tracking wrapper in the database would be all three of
 * those things wrong.
 *
 * Anything it does not recognise passes through untouched, including Google
 * News interstitials — those cannot be unwrapped, and pretending otherwise by
 * half-decoding them would be worse than leaving them honest.
 */
export function unwrapTrackingUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "bing.com" && host !== "bing.net") return url;

  const target = parsed.searchParams.get("url");
  if (!target) return url;

  // Validate before trusting it. A `url` parameter that is not an absolute
  // http(s) URL is not something to store as an article link.
  try {
    const inner = new URL(target);
    if (inner.protocol !== "https:" && inner.protocol !== "http:") return url;
    return inner.toString();
  } catch {
    return url;
  }
}

export type SweepResult = {
  source: string;
  fetched: number;
  /** Dropped by the source's title filter before ever reaching the database. */
  skipped?: number;
  inserted: number;
  error?: string;
};

/**
 * Apply a source's title filter. No filter means keep everything, because a
 * search feed has already done this job.
 *
 * Pure and exported so the test can assert the net's shape directly — that
 * "Unitree G1 spars with a human" survives and "Best robot vacuum deals"
 * does not. Getting this wrong is silent in both directions: too tight loses
 * stories, too loose costs money.
 */
export function filterItems(
  items: FeedItem[],
  match: RegExp | undefined,
): FeedItem[] {
  if (!match) return items;
  return items.filter((item) => match.test(item.title));
}

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

      const all = parseFeed(await response.text());
      const items = filterItems(all, source.match);
      let inserted = 0;
      for (const item of items) {
        const rows = await db
          .insert(signals)
          .values({
            source: source.id,
            kind: source.kind,
            language: source.language,
            title: item.title.slice(0, 500),
            url: unwrapTrackingUrl(item.url).slice(0, 1000),
            publishedAt: item.publishedAt,
          })
          .onConflictDoNothing({ target: signals.url })
          .returning({ id: signals.id });
        inserted += rows.length;
      }
      results.push({
        source: source.id,
        fetched: all.length,
        skipped: all.length - items.length,
        inserted,
      });
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
