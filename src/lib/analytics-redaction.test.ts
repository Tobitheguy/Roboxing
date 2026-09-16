import { describe, expect, it } from "vitest";

import {
  isPrivatePath,
  redactAnalyticsEvent,
} from "@/lib/analytics-redaction";

/**
 * These tests exist because `/privacy` makes two promises in plain English and
 * this function is the only thing keeping either of them true. If one of these
 * goes red, the fix is not to change the assertion — it is to decide whether
 * the privacy policy still says what the code does.
 */
const event = (url: string) => ({ url, type: "pageview" as const });

describe("isPrivatePath", () => {
  it("matches the private sections and everything beneath them", () => {
    expect(isPrivatePath("/admin")).toBe(true);
    expect(isPrivatePath("/admin/signals")).toBe(true);
    expect(isPrivatePath("/account")).toBe(true);
    expect(isPrivatePath("/account/picks")).toBe(true);
  });

  it("does not match a public path that merely starts with the same letters", () => {
    // The reason the check is `=== prefix || startsWith(prefix + "/")` rather
    // than a bare startsWith: a future public page called /accounts-explained
    // would otherwise silently stop being counted, and nobody would notice a
    // page that reports nothing.
    expect(isPrivatePath("/accounts-explained")).toBe(false);
    expect(isPrivatePath("/administration")).toBe(false);
    expect(isPrivatePath("/news/admin-interview")).toBe(false);
  });
});

describe("redactAnalyticsEvent", () => {
  it("drops admin and account page views entirely", () => {
    expect(redactAnalyticsEvent(event("https://roboxing.tv/admin"))).toBeNull();
    expect(
      redactAnalyticsEvent(event("https://roboxing.tv/admin/posts")),
    ).toBeNull();
    expect(
      redactAnalyticsEvent(event("https://roboxing.tv/account/picks")),
    ).toBeNull();
  });

  it("reports ordinary public pages unchanged", () => {
    const result = redactAnalyticsEvent(
      event("https://roboxing.tv/events/cyberhero-riyadh-2026"),
    );
    expect(result?.url).toBe("https://roboxing.tv/events/cyberhero-riyadh-2026");
  });

  it("keeps the attribution tags that say which post sent someone", () => {
    // This is the whole point of measuring. If `ref` ever stops surviving,
    // every link already posted to Instagram and TikTok goes unattributed —
    // those in-app browsers frequently send no referrer at all.
    const result = redactAnalyticsEvent(
      event("https://roboxing.tv/news/some-post?ref=ig"),
    );
    expect(result?.url).toBe("https://roboxing.tv/news/some-post?ref=ig");

    const utm = redactAnalyticsEvent(
      event("https://roboxing.tv/?utm_source=x&utm_campaign=launch"),
    );
    expect(utm?.url).toContain("utm_source=x");
    expect(utm?.url).toContain("utm_campaign=launch");
  });

  it("strips anything not on the allowlist, including a token or an address", () => {
    const result = redactAnalyticsEvent(
      event(
        "https://roboxing.tv/newsletter/confirmed?token=secret123&email=a@b.com&ref=x",
      ),
    );
    expect(result?.url).not.toContain("secret123");
    expect(result?.url).not.toContain("a@b.com");
    expect(result?.url).not.toContain("token");
    expect(result?.url).not.toContain("email");
    // and the one legitimate tag still survives the cull
    expect(result?.url).toContain("ref=x");
  });

  it("strips every copy of a repeated parameter, not just the first", () => {
    // Deleting from searchParams while iterating it skips entries, which is
    // why the keys are snapshotted first. A half-stripped URL would leak the
    // exact thing this function exists to remove.
    const result = redactAnalyticsEvent(
      event("https://roboxing.tv/?token=a&token=b&token=c"),
    );
    expect(result?.url).toBe("https://roboxing.tv/");
  });

  it("drops an event whose URL cannot be parsed rather than forwarding it", () => {
    expect(redactAnalyticsEvent(event("not a url"))).toBeNull();
    expect(redactAnalyticsEvent(event(""))).toBeNull();
  });

  it("preserves the other fields on the event", () => {
    const result = redactAnalyticsEvent({
      url: "https://roboxing.tv/results?token=x",
      type: "pageview" as const,
    });
    expect(result?.type).toBe("pageview");
  });
});
