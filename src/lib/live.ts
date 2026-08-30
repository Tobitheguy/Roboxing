import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { events } from "@/db/schema";

export type LiveNow = {
  eventSlug: string;
  eventName: string;
} | null;

/**
 * Whether anything is broadcasting right now.
 *
 * Drives the LIVE pill in the site header, which is the site's one piece of
 * global state — it has to be correct on every page, so it is resolved here
 * rather than passed down from whichever page happens to know.
 *
 * `status` is the single source of truth rather than a time window around
 * `starts_at`: an event that begins late, runs long, or is cancelled mid-card
 * must not show a LIVE badge with nothing behind it, and only an admin
 * flipping the switch knows which of those is happening.
 *
 * Wrapped in React's `cache()` so that several components asking in the same
 * render share one round trip instead of each opening its own.
 */
export const getLiveNow = cache(async (): Promise<LiveNow> => {
  const rows = await db
    .select({ slug: events.slug, name: events.name })
    .from(events)
    .where(eq(events.status, "live"))
    .limit(1);

  const event = rows[0];
  return event ? { eventSlug: event.slug, eventName: event.name } : null;
});
