import { describe, expect, it } from "vitest";

import { parseFeed } from "./signals";

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
