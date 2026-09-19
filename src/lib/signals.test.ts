import { describe, expect, it } from "vitest";

import {
  filterItems,
  parseFeed,
  RELEVANT_TITLE,
  SOURCES,
  unwrapTrackingUrl,
  WATCHED_LEAGUES,
} from "./signals";

/**
 * Fixtures are trimmed captures of the two real dialects the watcher reads:
 * Google News RSS 2.0 and YouTube's Atom. If a source ever emits something
 * the parser misses, the fix starts by adding its capture here.
 */

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
<title>query - Google News</title>
<item><title>Robot fight league expands <![CDATA[&]]> grows</title>
<link>https://news.google.com/rss/articles/abc123</link>
<pubDate>Tue, 08 Sep 2026 06:00:00 GMT</pubDate></item>
<item><title><![CDATA[众擎URKL揭幕之夜]]></title>
<link>https://news.google.com/rss/articles/zh456</link>
<pubDate>Fri, 17 Jul 2026 09:00:00 GMT</pubDate></item>
<item><title>No link, must be skipped</title></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<title>Channel uploads</title>
<entry><title>T800 highlight reel</title>
<link rel="alternate" href="https://www.youtube.com/watch?v=abc"/>
<published>2026-09-01T12:00:00+00:00</published></entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS items with CDATA titles and entities", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].url).toBe("https://news.google.com/rss/articles/abc123");
    expect(items[0].publishedAt?.toISOString()).toBe(
      "2026-09-08T06:00:00.000Z",
    );
    // Chinese titles survive untouched — the zh sweep is the valuable one.
    expect(items[1].title).toBe("众擎URKL揭幕之夜");
  });

  it("skips items without a link rather than inventing one", () => {
    expect(parseFeed(RSS).some((i) => i.title.startsWith("No link"))).toBe(
      false,
    );
  });

  it("parses Atom entries (the YouTube dialect)", () => {
    const items = parseFeed(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://www.youtube.com/watch?v=abc");
    expect(items[0].title).toBe("T800 highlight reel");
  });

  it("returns empty for garbage rather than throwing", () => {
    // The sweep must survive a source serving an error page as HTML.
    expect(parseFeed("<html><body>502 Bad Gateway</body></html>")).toEqual([]);
    expect(parseFeed("")).toEqual([]);
  });
});

/**
 * The title filter on publisher feeds.
 *
 * These sources are not searches — New Atlas is 60 items of motorcycles and
 * telescopes every morning — and every row that gets past this filter is a row
 * the classifier is paid to reject. Too tight loses stories silently; too loose
 * multiplies the daily bill. Both failures are invisible without these.
 */
describe("filterItems", () => {
  const item = (title: string) => ({
    title,
    url: "https://x.test/a",
    publishedAt: null,
  });

  it("keeps anything naming a robot or a fight", () => {
    const kept = filterItems(
      [
        item("Unitree's G1 can now spar a human autonomously"),
        item("EngineAI T800 enters the octagon in Riyadh"),
        item("Humanoid robot decapitated in first UFC-style bout"),
        item("CyberHero announces an eight-city season"),
      ],
      RELEVANT_TITLE,
    );
    expect(kept).toHaveLength(4);
  });

  it("drops the feed's ordinary traffic", () => {
    const kept = filterItems(
      [
        item("Best electric motorcycles of 2026, tested"),
        item("Webb telescope finds water on a distant world"),
        item("Qualcomm inks deal with Amazon for data centres"),
        item("This smart helmet has a heads-up display"),
      ],
      RELEVANT_TITLE,
    );
    expect(kept).toEqual([]);
  });

  it("keeps everything when a source has no filter", () => {
    // Google News sources ARE their query; filtering them again would drop
    // legitimate results the search already scoped, including Chinese titles
    // that match no English keyword.
    const items = [
      item("人形机器人格斗赛在利雅得揭幕"),
      item("anything at all"),
    ];
    expect(filterItems(items, undefined)).toEqual(items);
  });

  it("filters the Chinese sweep with nothing, by configuration", () => {
    const zh = SOURCES.find((s) => s.id === "google-news-zh");
    expect(zh?.search).toBe(true);
    expect(zh?.match).toBeUndefined();
  });

  it("gives every non-search feed a filter", () => {
    // A publisher feed added without one quietly puts a whole newsroom's daily
    // output into the classifier's queue, and the bill is the only symptom.
    for (const source of SOURCES) {
      if (source.search) continue;
      expect(source.match, `${source.id} has no match filter`).toBeDefined();
    }
  });
});

/**
 * The shape of the net.
 *
 * These assert the lessons of the Shadow Combat League miss — a league that ran
 * in Malaysia while a sweep in two languages saw nothing. Each one below is a
 * specific way the net silently narrows again, and every one of them is
 * invisible in production: a feed that stops matching does not error, it just
 * returns a quiet morning.
 */
describe("SOURCES", () => {
  it("gives every source a unique id", () => {
    // Ids are stored on the row and are how a dead feed is identified in the
    // sweep report. A duplicate makes two feeds indistinguishable there.
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sweeps every language this sport is organised in", () => {
    const languages = new Set(SOURCES.map((s) => s.language));
    // en and zh were the whole net when a Malaysian league went unnoticed.
    for (const lang of ["en", "zh", "ms", "ja", "ko", "ar"]) {
      expect(languages.has(lang as never), `no ${lang} source`).toBe(true);
    }
  });

  it("keeps a discovery feed whose job is leagues we do not know exist", () => {
    // The watchlist can only find leagues already named. This is the only
    // group that can find the next one, so it must never be the thing that
    // gets trimmed when the daily row count looks high.
    const discovery = SOURCES.filter((s) => s.id.includes("new-league"));
    expect(discovery.length).toBeGreaterThanOrEqual(2);
  });

  it("watches every league by name, including ones with no page yet", () => {
    // A league belongs here the day its name is first heard — before it is on
    // the site. Shadow Combat League is the case that proved the rule.
    expect(WATCHED_LEAGUES).toContain("Shadow Combat League");

    const watchlist = SOURCES.filter((s) => s.id.includes("watchlist"));
    expect(watchlist.length).toBeGreaterThanOrEqual(2);
    for (const source of watchlist) {
      const query = decodeURIComponent(source.url);
      for (const league of WATCHED_LEAGUES) {
        expect(query, `${source.id} does not watch ${league}`).toContain(
          league,
        );
      }
    }
  });

  it("puts a required term in front of every Bing OR group", () => {
    /*
     * Measured, and the failure is silent: Bing's news RSS returns an EMPTY
     * feed for a query that is nothing but an OR group, and a working one when
     * a required term leads. An empty feed looks exactly like a slow news
     * week, so nothing would ever report this as broken — which is the only
     * reason it is worth a test rather than a comment.
     *
     * The rule is about the OR, not the quote: `"humanoid robot" (fight OR
     * boxing)` leads with a quoted phrase and returns results.
     */
    for (const source of SOURCES.filter((s) => s.url.includes("bing.com"))) {
      const query = decodeURIComponent(
        new URL(source.url).searchParams.get("q") ?? "",
      );
      expect(query, `${source.id} has no query`).not.toBe("");

      const lead = query.split("(")[0];
      expect(lead.trim(), `${source.id} opens with its OR group`).not.toBe("");
      expect(lead, `${source.id} ORs outside a paren group`).not.toMatch(
        /\bOR\b/,
      );
    }
  });

  it("keeps the strict and the phrase-first English nets as separate feeds", () => {
    // The strict one requires the exact phrase "humanoid robot"; the phrase
    // one does not. Merging them back into a single query re-creates the miss:
    // Malaysian coverage said "robot fighting league" and never "humanoid
    // robot", and scored zero hits on the strict net.
    const strict = SOURCES.find((s) => s.id === "google-news-en");
    const phrase = SOURCES.find((s) => s.id === "google-news-en-phrase");
    expect(decodeURIComponent(strict?.url ?? "")).toContain('"humanoid robot"');
    expect(decodeURIComponent(phrase?.url ?? "")).not.toContain(
      '"humanoid robot"',
    );
  });
});

/**
 * Unwrapping search-engine redirects.
 *
 * This is the whole reason stage 3 can publish anything: a stored Bing wrapper
 * is a URL the publisher cannot be fetched from, deduped on, or linked to.
 */
describe("unwrapTrackingUrl", () => {
  it("pulls the publisher URL out of a Bing news link", () => {
    const wrapped =
      "http://www.bing.com/news/apiclick.aspx?ref=FexRss&aid=&tid=6aa4da08&url=https%3A%2F%2Fwww.moneycontrol.com%2Fnews%2Ftrends%2Frobot-boxing-14026114.html&c=1";
    expect(unwrapTrackingUrl(wrapped)).toBe(
      "https://www.moneycontrol.com/news/trends/robot-boxing-14026114.html",
    );
  });

  it("leaves a Google News interstitial alone", () => {
    // It cannot be unwrapped -- the target is not in the URL at all. Passing it
    // through unchanged keeps the row honest about being unreadable.
    const google = "https://news.google.com/rss/articles/CBMiogFBVV95cUx?oc=5";
    expect(unwrapTrackingUrl(google)).toBe(google);
  });

  it("leaves an ordinary publisher URL alone", () => {
    const direct = "https://www.therobotreport.com/some-story/";
    expect(unwrapTrackingUrl(direct)).toBe(direct);
  });

  it("refuses a wrapper whose target is not an http URL", () => {
    // An open-redirect parameter is attacker-controlled input, and this value
    // is about to be fetched by the server and shown to readers as a source.
    const bad =
      "http://www.bing.com/news/apiclick.aspx?url=javascript%3Aalert(1)";
    expect(unwrapTrackingUrl(bad)).toBe(bad);
    const missing = "http://www.bing.com/news/apiclick.aspx?ref=FexRss";
    expect(unwrapTrackingUrl(missing)).toBe(missing);
  });

  it("survives a malformed URL", () => {
    expect(unwrapTrackingUrl("not a url")).toBe("not a url");
  });
});
