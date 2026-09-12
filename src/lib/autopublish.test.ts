import { describe, expect, it } from "vitest";

import {
  htmlToText,
  isFetchableArticle,
  rejectBrief,
  slugify,
  uniqueSlug,
  withAttribution,
  type Brief,
} from "@/lib/autopublish";

/**
 * The pure half of the auto-publisher.
 *
 * Nothing here touches the network or the database, and that division is the
 * point: every decision that can wrongly put a post on the public site — is
 * this URL readable, is this brief usable, what slug does it take — is a
 * function that can be asserted on.
 */

describe("htmlToText", () => {
  it("drops scripts, styles and chrome entirely", () => {
    const html = `
      <html><head><style>.a{color:red}</style></head>
      <body>
        <nav>Home About Subscribe</nav>
        <p>Team FBA beat Team Al Majd 4-3 in Riyadh.</p>
        <script>window.ads = 1;</script>
        <footer>Copyright 2026</footer>
      </body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("Team FBA beat Team Al Majd 4-3 in Riyadh.");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("window.ads");
    expect(text).not.toContain("Home About Subscribe");
    expect(text).not.toContain("Copyright 2026");
  });

  it("keeps paragraphs apart instead of running words together", () => {
    const text = htmlToText("<p>First round.</p><p>Second round.</p>");
    // Without block-boundary handling this reads "First round.Second round."
    expect(text).toMatch(/First round\.\s+Second round\./);
  });

  it("decodes entities after stripping tags, not before", () => {
    // The dangerous order: decode first and this &lt;script&gt; becomes a real
    // tag that the stripper has already run past, putting JS in the model's
    // prompt as if it were prose.
    const text = htmlToText("<p>&lt;script&gt;alert(1)&lt;/script&gt; kick</p>");
    expect(text).toContain("<script>alert(1)</script> kick");
  });

  it("decodes the punctuation publishers actually emit", () => {
    expect(htmlToText("<p>Unitree&rsquo;s G1 &mdash; 4&ndash;3</p>")).toBe(
      "Unitree’s G1 — 4–3",
    );
  });
});

describe("slugify", () => {
  it("makes a clean slug from a headline", () => {
    expect(slugify("Team FBA takes the first CyberHero title, 4–3")).toBe(
      "team-fba-takes-the-first-cyberhero-title-4-3",
    );
  });

  it("drops apostrophes rather than hyphenating them", () => {
    expect(slugify("Unitree's G1 spars a human")).toBe(
      "unitrees-g1-spars-a-human",
    );
  });

  it("never ends in a hyphen, even when the cut lands on one", () => {
    const slug = slugify("a".repeat(68) + " something else entirely");
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.length).toBeLessThanOrEqual(70);
  });

  it("returns empty for a title with no Latin characters", () => {
    // Not a failure — uniqueSlug() is what turns this into a usable slug. The
    // point of the assertion is that it does NOT return "-".
    expect(slugify("人形机器人格斗")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("passes an unused slug through", () => {
    expect(uniqueSlug("Riyadh result", new Set())).toBe("riyadh-result");
  });

  it("walks past a collision", () => {
    const taken = new Set(["riyadh-result", "riyadh-result-2"]);
    expect(uniqueSlug("Riyadh result", taken)).toBe("riyadh-result-3");
  });

  it("falls back to a usable slug when the title slugifies to nothing", () => {
    expect(uniqueSlug("人形机器人格斗", new Set())).toBe("brief");
    expect(uniqueSlug("人形机器人格斗", new Set(["brief"]))).toBe("brief-2");
  });
});

describe("isFetchableArticle", () => {
  it("accepts a publisher URL", () => {
    expect(
      isFetchableArticle("https://www.therobotreport.com/some-story/"),
    ).toBe(true);
  });

  it("rejects Google News interstitials", () => {
    // The case this function exists for: these links serve a JS redirect page
    // with the publisher's URL nowhere in it, so a brief written from one would
    // be written from a navigation shell.
    expect(
      isFetchableArticle("https://news.google.com/rss/articles/CBMiogFBVV95cUx"),
    ).toBe(false);
  });

  it("rejects other Google hosts and malformed rows", () => {
    expect(isFetchableArticle("https://google.com/x")).toBe(false);
    expect(isFetchableArticle("https://news.google.com.evil.test/x")).toBe(true);
    expect(isFetchableArticle("not a url")).toBe(false);
    expect(isFetchableArticle("ftp://example.com/x")).toBe(false);
  });
});

describe("withAttribution", () => {
  it("appends the source as a markdown link on its own paragraph", () => {
    const body = withAttribution(
      "Something happened.",
      "https://www.saudigazette.com.sa/article/123",
    );
    expect(body).toBe(
      "Something happened.\n\nSource: [saudigazette.com.sa](https://www.saudigazette.com.sa/article/123)",
    );
  });
});

describe("rejectBrief", () => {
  const good: Brief = {
    publish: true,
    reason: "ok",
    title: "Unitree shows an autonomous sparring demo",
    summary:
      "Unitree published video of two G1 humanoids sparring without a human pilot.",
    body: "x".repeat(400),
  };

  it("passes a complete brief", () => {
    expect(rejectBrief(good)).toBeNull();
  });

  it("reports the model's own reason when it declines", () => {
    expect(
      rejectBrief({ ...good, publish: false, reason: "already covered" }),
    ).toBe("already covered");
  });

  it("gives a reason even when the model declines without one", () => {
    expect(rejectBrief({ ...good, publish: false, reason: "  " })).toBe(
      "model declined",
    );
  });

  it("refuses a brief with nothing in it", () => {
    // An empty post is worse than no post: it is on the sitemap, in the feed
    // and in the newsletter before anyone notices.
    expect(rejectBrief({ ...good, body: "too short" })).toBe("body too short");
    expect(rejectBrief({ ...good, title: "Riyadh" })).toBe("title too short");
    expect(rejectBrief({ ...good, summary: "Short." })).toBe(
      "summary too short",
    );
  });

  it("refuses markdown in the body", () => {
    // The body renderer takes plain text with `[label](url)` links and nothing
    // else, so a heading or a bullet list renders as literal "## " on the page.
    expect(rejectBrief({ ...good, body: `## Result\n\n${"x".repeat(400)}` })).toBe(
      "body contains markdown",
    );
    expect(rejectBrief({ ...good, body: `- one\n- two\n${"x".repeat(400)}` })).toBe(
      "body contains markdown",
    );
  });
});
