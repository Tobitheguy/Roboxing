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

/**
 * Which sweep found a row. Stored as text, so adding one is a code change and
 * not a migration.
 *
 * It was `"en" | "zh"` until the Shadow Combat League went unnoticed: a league
 * that exists only in Malaysian coverage is invisible to a net cast in two
 * languages. The set below is not "every language" — it is every language this
 * sport is currently organised in. Adding one is cheap; the reason to keep the
 * list explicit is that the inbox groups by it and an unexpected value there
 * would quietly land in the wrong bucket.
 */
export type SignalLanguage = "en" | "zh" | "ms" | "ja" | "ko" | "ar";

export type SignalSource = {
  /** Stable identifier stored on each row, e.g. "google-news-en". */
  id: string;
  url: string;
  kind: "news" | "video";
  language: SignalLanguage;
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
  /\b(robot|robots|robotic|humanoid|humanoids|android|unitree|engineai|agibot|booster|cyberhero|urkl|whrg|\bufb\b|\bREK\b|battlebots|mech|mecha|iron fist|mecha king|shadow combat)\b|\b(fight|fights|fighting|boxing|kickbox|kickboxing|combat|bout|bouts|brawl|spar|sparring|knockout|octagon|ring|martial arts|mma|ufc|wrestl|duel|melee)/i;

/**
 * Google News editions. `ceid` is the one that actually selects the index —
 * `hl`/`gl` alone return the US edition with translated chrome.
 *
 * Regional English editions are here because of the Shadow Combat League miss.
 * Malaysian and Gulf outlets publish in English, but the US edition does not
 * carry them: the US sweep saw The Edge Malaysia and The Malaysian Reserve only
 * when they syndicated a Riyadh story big enough to travel. A regional league's
 * first announcement never is.
 */
const EDITIONS = {
  us: { hl: "en-US", gl: "US", ceid: "US:en" },
  my: { hl: "en-MY", gl: "MY", ceid: "MY:en" },
  sg: { hl: "en-SG", gl: "SG", ceid: "SG:en" },
  ae: { hl: "en-AE", gl: "AE", ceid: "AE:en" },
  cn: { hl: "zh-CN", gl: "CN", ceid: "CN:zh-Hans" },
  tw: { hl: "zh-TW", gl: "TW", ceid: "TW:zh-Hant" },
  msMY: { hl: "ms-MY", gl: "MY", ceid: "MY:ms" },
  jp: { hl: "ja", gl: "JP", ceid: "JP:ja" },
  kr: { hl: "ko", gl: "KR", ceid: "KR:ko" },
  arAE: { hl: "ar", gl: "AE", ceid: "AE:ar" },
} as const;

type Edition = (typeof EDITIONS)[keyof typeof EDITIONS];

function googleNews(query: string, edition: Edition): string {
  return (
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(query) +
    `&hl=${edition.hl}&gl=${edition.gl}&ceid=${edition.ceid}`
  );
}

function bingNews(query: string, setlang?: string): string {
  return (
    "https://www.bing.com/news/search?q=" +
    encodeURIComponent(query) +
    "&format=RSS" +
    (setlang ? `&setlang=${setlang}` : "")
  );
}

/**
 * THE QUERIES, and what each one is for.
 *
 * Four jobs, not one, and they fail differently — which is why they are four
 * feeds instead of one long OR. A query that is broad enough to discover an
 * unknown league is too broad to run on every regional edition; a query that
 * names our leagues can never find the next one.
 */

/**
 * 1. The original net. Requires the exact phrase "humanoid robot", which is
 *    precise and is exactly how we missed Malaysia: coverage that says "robot
 *    fighting league" and never "humanoid robot" scored zero hits here.
 */
const Q_STRICT_EN =
  '"humanoid robot" (fight OR boxing OR kickboxing OR combat OR URKL OR CyberHero)';

/**
 * 2. Phrase-first, no "humanoid robot" requirement. Every phrase below is a
 *    thing only this sport says, so dropping the robot-noun requirement costs
 *    little precision — "robot boxing" is never about a vacuum cleaner.
 */
const Q_PHRASE_EN =
  '"robot boxing" OR "robot fighting" OR "robot combat" OR "robot fight night" OR "humanoid fight" OR "fighting robots" OR "robot martial arts" OR "robot kickboxing"';

/**
 * 3. DISCOVERY — the query whose entire job is to find leagues we do not know
 *    exist. This is the one that would have caught Shadow Combat League.
 */
const Q_NEW_LEAGUE_EN =
  '"robot fighting league" OR "robot combat league" OR "robot boxing league" OR "humanoid robot league" OR "robot fight league" OR "robot fighting championship" OR "humanoid fighting championship"';

/**
 * 4. THE WATCHLIST — every league we already track, by name, plus every league
 *    we have merely heard of. A named query catches an event announcement that
 *    mentions no generic keyword at all ("Shadow Combat League returns to Kuala
 *    Lumpur in March"), which the other three would all miss.
 *
 *    ADD A LEAGUE HERE THE DAY YOU FIRST HEAR ITS NAME, before it has a page on
 *    the site. That is the cheapest possible insurance and the whole point of a
 *    watchlist: the cost of watching a league that turns out not to exist is one
 *    empty feed a morning.
 */
export const WATCHED_LEAGUES = [
  "Shadow Combat League",
  "CyberHero",
  "URKL",
  "Unitree Robot Kombat",
  "Iron Fist King",
  "Mecha King",
  "World Humanoid Robot Games",
  "Ultimate Fighting Bots",
  "Robot Boxing League",
  "Mecha Fighting League",
] as const;

const Q_WATCHLIST = WATCHED_LEAGUES.map((name) => `"${name}"`).join(" OR ");

/** The Chinese sweep — unchanged terms, now run on both mainland and Taiwan. */
const Q_ZH = "人形机器人 格斗 OR 机器人格斗 OR 机甲格斗";

/** Chinese discovery: league/competition nouns rather than fight nouns. */
const Q_NEW_LEAGUE_ZH = "机器人格斗联赛 OR 人形机器人格斗赛 OR 机甲格斗联盟";

/**
 * The non-CJK regional queries.
 *
 * Written from the terms the local press actually uses, and each one is
 * VERIFIED TO RETURN ITEMS rather than assumed — an unverified translation is
 * a feed that silently returns zero every morning and looks identical to a
 * quiet news day. `npm run signals:sources` re-checks them all without touching
 * the database.
 */
const Q_MS = '"robot humanoid" OR "pertarungan robot" OR "tinju robot"';
const Q_JA = "ヒューマノイド 格闘 OR ロボット格闘技 OR ロボット ボクシング";
const Q_KO = "휴머노이드 격투 OR 로봇 격투 OR 로봇 복싱";
const Q_AR = "روبوت قتال OR ملاكمة الروبوتات OR روبوتات بشرية قتال";

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
const BING_NEWS_EN = bingNews(Q_STRICT_EN);
const BING_NEWS_ZH = bingNews("人形机器人 格斗", "zh-hans");

/**
 * Bing gets the discovery and watchlist queries too, and this is the pair that
 * matters most in this file: Bing links unwrap to the publisher, so a league
 * discovered HERE can be auto-published. The same discovery on Google News
 * lands as an interstitial stage 3 can never write from — it would sit in the
 * inbox waiting for a human to notice it.
 *
 * WHY THESE TWO ARE PHRASED DIFFERENTLY FROM THE GOOGLE ONES, and do not
 * "simplify" them back:
 *
 * Bing's news RSS silently returns an EMPTY FEED for a query that is nothing
 * but an OR group — parenthesised or not. It needs a REQUIRED TERM in front of
 * the alternatives. Measured, not read in a doc; every line is a real count:
 *
 *   ("robot fighting league" OR "robot combat…")  → 0 items
 *   robot fighting league OR robot combat league  → 0 items
 *   "Iron Fist King" OR CyberHero OR URKL         → 0 items
 *   robot ("fighting league" OR "combat league")  → 7 items
 *   robot (CyberHero OR URKL OR "Iron Fist King") → 3 items
 *   "humanoid robot" (fight OR boxing)            → 9 items
 *
 * The last line is why the rule is "a required term first" and not "never
 * start with a quote": `bing-news-en` has led with a quoted phrase since the
 * beginning and works fine, because the OR group sits behind it.
 *
 * So both queries lead with the bare word `robot`. The cost is real and worth
 * stating: a Bing watchlist hit must contain the word "robot" somewhere, so a
 * piece headlined "Shadow Combat League returns to Kuala Lumpur" and never
 * saying "robot" is invisible here. Google's watchlist feed has no such
 * requirement and is the one that catches that — which is why both exist.
 */
const BING_NEW_LEAGUE_EN = bingNews(
  'robot ("fighting league" OR "combat league" OR "boxing league" OR "fight league" OR "fighting championship")',
);
const BING_WATCHLIST_EN = bingNews(
  `robot (${WATCHED_LEAGUES.map((name) => (name.includes(" ") ? `"${name}"` : name)).join(" OR ")})`,
);

/**
 * The organisers' own YouTube channels.
 *
 * This is where the footage lands first, usually before any outlet writes
 * about it — Unitree posted the Iron Fist King material itself, and EngineAI
 * posts URKL's. A channel feed catches that the day it goes up rather than
 * whenever a journalist gets to it.
 *
 * EVERY ID BELOW WAS RESOLVED FROM THE HANDLE AND THEN THE FEED WAS READ. That
 * second step is not ceremony: `youtube.com/@engineai` resolves fine, is titled
 * "Engine AI", and is an unrelated channel posting travel clips — the robot
 * company is `@EngineAIRobot`. `@CGTN` resolves to CGTN Español. Both were live
 * on this site as league links before anyone opened a feed.
 *
 * `newchinatv` (Xinhua's English channel) is deliberately absent: its feed
 * returns zero entries, so subscribing to it would be subscribing to silence.
 *
 * Title-filtered like every publisher feed — these are general channels, and
 * Unitree posts far more about warehouse robots than about fighting.
 */
const YOUTUBE_CHANNELS: SignalSource[] = [
  {
    id: "yt-engineai",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCFsR6bmOGCOCAdqPccmBggg",
    kind: "video",
    language: "en",
    match: RELEVANT_TITLE,
  },
  {
    id: "yt-unitree",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsMbp4V8oxzHCMdOUP-3oWw",
    kind: "video",
    language: "en",
    match: RELEVANT_TITLE,
  },
  {
    id: "yt-hero-esports",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCrpMZED321TF0BYKePONRmA",
    kind: "video",
    language: "en",
    match: RELEVANT_TITLE,
  },
  {
    id: "yt-cctv-video-news",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCmv5DbNpxH8X2eQxJBqEjKQ",
    kind: "video",
    language: "en",
    match: RELEVANT_TITLE,
  },
  {
    id: "yt-cctv",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCcLK3j-XWdGBnt5bR9NJHaQ",
    kind: "video",
    language: "zh",
    match: RELEVANT_TITLE,
  },
];

/** Shorthand — every search feed is `search: true` and carries no filter. */
function searchFeed(
  id: string,
  url: string,
  language: SignalLanguage,
): SignalSource {
  return { id, url, kind: "news", language, search: true };
}

/**
 * The search feeds, in four groups.
 *
 * WHAT THIS COSTS, because widening a net is not free: every row that lands
 * here is a row stage 2 pays to score. The sweep ran 10–29 items a day on the
 * old four feeds; these eighteen should be budgeted at a few times that, and
 * the honest number will be in the first morning's `results` array rather than
 * in this comment. If it ever becomes a real bill, the lever is the regional
 * editions — they overlap most with `us` — and not the discovery queries, which
 * are the entire reason this exists.
 */
const SEARCH_FEEDS: SignalSource[] = [
  // --- The broad net, run wide -------------------------------------------
  searchFeed("google-news-en", googleNews(Q_STRICT_EN, EDITIONS.us), "en"),
  searchFeed(
    "google-news-en-phrase",
    googleNews(Q_PHRASE_EN, EDITIONS.us),
    "en",
  ),
  searchFeed("google-news-zh", googleNews(Q_ZH, EDITIONS.cn), "zh"),
  searchFeed("google-news-zh-tw", googleNews(Q_ZH, EDITIONS.tw), "zh"),
  searchFeed("bing-news-en", BING_NEWS_EN, "en"),
  searchFeed("bing-news-zh", BING_NEWS_ZH, "zh"),

  // --- Discovery: leagues we do not know exist ----------------------------
  searchFeed(
    "google-news-new-league-en",
    googleNews(Q_NEW_LEAGUE_EN, EDITIONS.us),
    "en",
  ),
  searchFeed(
    "google-news-new-league-zh",
    googleNews(Q_NEW_LEAGUE_ZH, EDITIONS.cn),
    "zh",
  ),
  searchFeed("bing-news-new-league-en", BING_NEW_LEAGUE_EN, "en"),

  // --- The watchlist: every league by name --------------------------------
  searchFeed(
    "google-news-watchlist",
    googleNews(Q_WATCHLIST, EDITIONS.us),
    "en",
  ),
  searchFeed("bing-news-watchlist", BING_WATCHLIST_EN, "en"),

  /*
   * --- Regional English: ONE edition, and the other two were measured out ---
   *
   * A Google News edition re-ranks a mostly global index; it does not open a
   * local one. Comparing publisher domains on the same query, same morning:
   *
   *   US  80 domains
   *   MY  79 — 6 of them absent from US (Asia Times, TechNode Global, TVB,
   *            The Online Citizen, …)
   *   SG  79 — byte-identical to MY
   *   AE  79 — ZERO domains absent from US
   *
   * So SG and AE were ~200 extra rows a morning for nothing, and they are
   * deliberately not here. MY earns its place on six Asian outlets. If someone
   * re-adds SG or AE, this is the measurement to re-run first, not an opinion
   * to argue with.
   */
  searchFeed("google-news-my", googleNews(Q_PHRASE_EN, EDITIONS.my), "en"),

  // --- The other languages this sport is organised in ---------------------
  searchFeed("google-news-ms", googleNews(Q_MS, EDITIONS.msMY), "ms"),
  searchFeed("google-news-ja", googleNews(Q_JA, EDITIONS.jp), "ja"),
  searchFeed("google-news-ko", googleNews(Q_KO, EDITIONS.kr), "ko"),
  searchFeed("google-news-ar", googleNews(Q_AR, EDITIONS.arAE), "ar"),
];

export const SOURCES: SignalSource[] = [
  ...SEARCH_FEEDS,
  ...PUBLISHER_FEEDS,
  ...YOUTUBE_CHANNELS,
  // Bilibili slots go here as their uids are collected — same shape, zero
  // code. They need a human to paste a verified URL: Bilibili returns 200 for
  // a space id that does not exist.
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
