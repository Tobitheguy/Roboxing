import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/app-url";
import { NAV_ITEMS } from "@/lib/nav";
import { getSitemapContent } from "@/lib/queries";
import { rethrowControlFlow } from "@/lib/next-errors";

/**
 * Every page worth indexing.
 *
 * New with the site going public, and it is not paperwork. Search is the half
 * of distribution that keeps working after a clip stops trending: a post about
 * an event is dead in three days, and the page about the same event answers
 * "who won" for years. Nothing on this site was reachable by a crawler until
 * now, so there is no existing index to preserve — this is the first one.
 *
 * `/watch/[slug]` is deliberately absent: those URLs are 308s to `/events/`,
 * and listing a redirect in a sitemap asks a crawler to spend budget
 * discovering that.
 */
/**
 * Regenerate hourly, on top of the revalidation admin writes already trigger.
 *
 * The admin path covers most changes, and there is one it cannot: a post
 * scheduled for tomorrow becomes public at its publish time with nobody
 * touching the admin panel, so no write fires and no revalidation happens.
 * Without this the sitemap would omit it until the next unrelated edit.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...NAV_ITEMS.map((item) => ({
      url: `${base}${item.href}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  let content;
  try {
    content = await getSitemapContent();
  } catch (error) {
    // A database hiccup must not fail the build or return a 500 to a crawler.
    // A sitemap listing only the static pages is a degraded answer; no sitemap
    // at all can get the whole file dropped from Search Console.
    rethrowControlFlow(error);
    console.error("[sitemap] could not load content:", error);
    return staticEntries;
  }

  return [
    ...staticEntries,
    ...content.posts.map((p) => ({
      url: `${base}/news/${p.slug}`,
      lastModified: p.publishedAt ?? undefined,
      changeFrequency: "monthly" as const,
      // The highest of any detail page. A post is the only thing here written
      // to be read on its own rather than looked up.
      priority: 0.9,
    })),
    ...content.events.map((e) => ({
      url: `${base}/events/${e.slug}`,
      // The event's own date, not the row's. It is the closest thing we have
      // to "when did this page's content last mean something new", and it is
      // what makes a crawler revisit a card that filled in this week rather
      // than one that finished in 2024.
      lastModified: e.startsAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...content.competitions.map((c) => ({
      url: `${base}/competitions/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...content.teams.map((t) => ({
      url: `${base}/teams/${t.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...content.robots.map((r) => ({
      url: `${base}/robots/${r.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
