import { describe, expect, it } from "vitest";

import {
  describeEvent,
  describeResult,
  digestSubject,
  escapeHtml,
  hasNews,
  renderDigest,
  type DigestData,
  type DigestEvent,
  type DigestResult,
} from "./digest";

const result = (over: Partial<DigestResult> = {}): DigestResult => ({
  eventName: "URKL Opener",
  eventSlug: "urkl-opener",
  competitionName: "URKL",
  robotAName: "White Eagle",
  robotBName: "Matador",
  winnerName: "Matador",
  finish: "Decision · R5",
  startsAt: new Date("2026-05-01T12:00:00Z"),
  timezone: "Asia/Shanghai",
  ...over,
});

const event = (over: Partial<DigestEvent> = {}): DigestEvent => ({
  name: "CyberHero Riyadh",
  slug: "cyberhero-riyadh",
  competitionName: "CyberHero",
  startsAt: new Date("2026-09-09T17:00:00Z"),
  startTimeTbd: false,
  timezone: "Asia/Riyadh",
  city: "Riyadh",
  country: "SA",
  broadcastName: null,
  ...over,
});

const data = (over: Partial<DigestData> = {}): DigestData => ({
  results: [],
  events: [],
  posts: [],
  since: new Date("2026-09-01T00:00:00Z"),
  generatedAt: new Date("2026-09-08T00:00:00Z"),
  ...over,
});

describe("hasNews", () => {
  /*
   * The rule the whole send schedule rests on. Upcoming events are always
   * present — there are four seeded right now — so a digest that counted them
   * as news would mail the list every single week whether or not the sport did
   * anything, which is how a list learns to ignore you.
   */
  it("is false when only upcoming events exist", () => {
    expect(hasNews(data({ events: [event()] }))).toBe(false);
  });

  it("is true for a result", () => {
    expect(hasNews(data({ results: [result()] }))).toBe(true);
  });

  it("is true for a post", () => {
    const posts = [
      {
        title: "URKL explained",
        slug: "urkl-explained",
        summary: null,
        publishedAt: new Date("2026-09-05T00:00:00Z"),
      },
    ];
    expect(hasNews(data({ posts }))).toBe(true);
  });
});

describe("escapeHtml", () => {
  it("neutralises markup characters", () => {
    expect(escapeHtml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&#39;");
  });

  it("survives an ampersand in a team name, which is the realistic case", () => {
    expect(escapeHtml("Tsinghua & HKU")).toBe("Tsinghua &amp; HKU");
  });
});

describe("describeResult", () => {
  it("names the winner and the loser in that order", () => {
    expect(describeResult(result())).toBe(
      "Matador def. White Eagle — Decision · R5",
    );
  });

  it("works when the winner is robot A", () => {
    expect(describeResult(result({ winnerName: "White Eagle" }))).toBe(
      "White Eagle def. Matador — Decision · R5",
    );
  });

  /*
   * A draw and a no contest have no winner. Writing "null def. Matador" is the
   * exact shape of bug that reaches an inbox and cannot be taken back.
   */
  it("does not invent a winner for a draw", () => {
    expect(
      describeResult(result({ winnerName: null, finish: "Draw" })),
    ).toBe("White Eagle vs Matador — Draw");
  });
});

describe("describeEvent", () => {
  it("includes the time when one is known", () => {
    expect(describeEvent(event())).toContain("Riyadh");
    expect(describeEvent(event())).not.toContain("time TBA");
  });

  /*
   * Organizers announce dates without times, and printing an invented clock
   * was a real bug on five call sites once. The newsletter is the worst place
   * to repeat it — a wrong time in an email sends someone to a stream an hour
   * early and there is no edit button.
   */
  it("says the time is unknown rather than inventing one", () => {
    const described = describeEvent(event({ startTimeTbd: true }));
    expect(described).toContain("time TBA");
  });
});

describe("digestSubject", () => {
  it("leads with a result, because that is the concrete thing", () => {
    expect(digestSubject(data({ results: [result()] }))).toBe(
      "Matador def. White Eagle",
    );
  });

  it("counts the rest", () => {
    const posts = [
      {
        title: "A",
        slug: "a",
        summary: null,
        publishedAt: new Date("2026-09-05T00:00:00Z"),
      },
    ];
    expect(digestSubject(data({ results: [result()], posts }))).toBe(
      "Matador def. White Eagle (+1 more)",
    );
  });

  it("falls back to a headline when there are no results", () => {
    const posts = [
      {
        title: "Iron Fist King, revisited",
        slug: "ifk",
        summary: null,
        publishedAt: new Date("2026-09-05T00:00:00Z"),
      },
    ];
    expect(digestSubject(data({ posts }))).toBe("Iron Fist King, revisited");
  });
});

describe("renderDigest", () => {
  const opts = {
    baseUrl: "https://roboxing.tv",
    unsubscribeUrl: "https://roboxing.tv/api/newsletter/unsubscribe?token=abc",
  };

  it("puts the unsubscribe link in BOTH parts", () => {
    // A text part without a way out is the version that reaches a plain-text
    // client, and an unsubscribe that only exists in the HTML is not one.
    const rendered = renderDigest(data({ results: [result()] }), opts);
    expect(rendered.html).toContain(opts.unsubscribeUrl);
    expect(rendered.text).toContain(opts.unsubscribeUrl);
  });

  it("escapes content that reaches the HTML", () => {
    const posts = [
      {
        title: 'Fight <script>alert("x")</script>',
        slug: "x",
        summary: null,
        publishedAt: new Date("2026-09-05T00:00:00Z"),
      },
    ];
    const rendered = renderDigest(data({ posts }), opts);
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
  });

  it("builds absolute links, since a relative one is dead in an inbox", () => {
    const rendered = renderDigest(data({ results: [result()] }), opts);
    expect(rendered.html).toContain("https://roboxing.tv/events/urkl-opener");
    expect(rendered.text).toContain("https://roboxing.tv/events/urkl-opener");
  });

  it("tolerates a base URL with a trailing slash", () => {
    const rendered = renderDigest(data({ results: [result()] }), {
      ...opts,
      baseUrl: "https://roboxing.tv/",
    });
    expect(rendered.html).not.toContain("roboxing.tv//events");
  });

  it("carries upcoming events as context when there is news", () => {
    const rendered = renderDigest(
      data({ results: [result()], events: [event()] }),
      opts,
    );
    expect(rendered.text).toContain("NEXT UP");
    expect(rendered.text).toContain("CyberHero Riyadh");
  });
});
