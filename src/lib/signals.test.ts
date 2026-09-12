import { describe, expect, it } from "vitest";

import {
  filterItems,
  parseFeed,
  RELEVANT_TITLE,
  SOURCES,
  unwrapTrackingUrl,
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
  const item = (title: string) => ({ title, url: "https://x.test/a", publishedAt: null });

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
    const items = [item("人形机器人格斗赛在利雅得揭幕"), item("anything at all")];
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
