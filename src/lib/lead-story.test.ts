import { describe, expect, it } from "vitest";

import { pickLeadIndex } from "./lead-story";

const NOW = new Date("2026-09-09T05:00:00Z");
const hours = (n: number) => new Date(NOW.getTime() + n * 3600_000);

const feed = [
  { eventSlug: null }, // newest — a general piece
  { eventSlug: null },
  { eventSlug: "cyberhero-riyadh-2026" }, // the preview, buried
  { eventSlug: "urkl-opening-shenzhen-2026" },
];

describe("pickLeadIndex", () => {
  /*
   * The case this exists for. On the morning of the first covered event the
   * preview of a fight thirteen hours away sat seventh in the feed, purely
   * because it had been written before the other pieces were seeded.
   */
  it("leads with coverage of an imminent event, not the newest post", () => {
    const next = { slug: "cyberhero-riyadh-2026", startsAt: hours(13) };
    expect(pickLeadIndex(feed, next, NOW)).toBe(2);
  });

  it("falls back to newest when nothing covers the next event", () => {
    const next = { slug: "some-event-nobody-wrote-about", startsAt: hours(13) };
    expect(pickLeadIndex(feed, next, NOW)).toBe(0);
  });

  it("falls back to newest when there is no upcoming event", () => {
    expect(pickLeadIndex(feed, null, NOW)).toBe(0);
  });

  /*
   * Self-correcting: once the fight is over the preview is the least
   * interesting thing on the page, and the "just happened" panel takes over.
   * Nothing has to be switched off by hand.
   */
  it("stops leading with the preview once the event has started", () => {
    const next = { slug: "cyberhero-riyadh-2026", startsAt: hours(-1) };
    expect(pickLeadIndex(feed, next, NOW)).toBe(0);
  });

  it("ignores an event too far out to be news yet", () => {
    const next = { slug: "cyberhero-riyadh-2026", startsAt: hours(24 * 30) };
    expect(pickLeadIndex(feed, next, NOW)).toBe(0);
  });

  it("takes the event right at the edge of the window", () => {
    const next = { slug: "cyberhero-riyadh-2026", startsAt: hours(24 * 7 - 1) };
    expect(pickLeadIndex(feed, next, NOW)).toBe(2);
  });

  it("prefers the most recent piece when an event has several", () => {
    const many = [
      { eventSlug: null },
      { eventSlug: "cyberhero-riyadh-2026" }, // newer coverage
      { eventSlug: "cyberhero-riyadh-2026" }, // older coverage
    ];
    const next = { slug: "cyberhero-riyadh-2026", startsAt: hours(5) };
    expect(pickLeadIndex(many, next, NOW)).toBe(1);
  });

  it("survives an empty feed", () => {
    expect(pickLeadIndex([], null, NOW)).toBe(0);
  });
});
