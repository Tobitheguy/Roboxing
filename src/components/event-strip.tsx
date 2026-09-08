import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Tv } from "lucide-react";

import { Countdown } from "@/components/countdown";
import { EventTime } from "@/components/event-time";
import { getFeaturedEvent } from "@/lib/queries";
import { rethrowControlFlow } from "@/lib/next-errors";

/**
 * The bar under the header naming whatever is next.
 *
 * Lifted from Formula1.com, which keeps a permanent strip reading
 * "R14 | 11–13 SEP | 🇪🇸 Spain" with the viewer's clock and the track's clock
 * side by side. It is the single best idea on any of the sites looked at, and
 * it is worth more here than it is there for two reasons:
 *
 * 1. **The calendar is sparse.** Roughly one event a month across the whole
 *    sport. A visitor's first question is "is anything happening", and the
 *    answer should not require finding the schedule page. F1 can afford to
 *    bury it; a sport nobody follows yet cannot.
 *
 * 2. **The events are somewhere else.** Shenzhen, Riyadh, Beijing — and the
 *    audience is American. The dual clock is not a nicety, it is the whole
 *    reason someone knows whether to stay up.
 *
 * One difference from F1, and it is the point Tobias made: F1 has ONE
 * championship, so its bar never has to say which. This one always names the
 * league, because "the next event" is meaningless across five of them.
 */
export async function EventStrip() {
  // Request-time, not build-time. Without this the strip is prerendered into
  // static HTML and freezes on whatever was next at deploy — which on a site
  // whose whole job is "what is on" is worse than having no strip.
  await connection();

  let featured;
  try {
    featured = await getFeaturedEvent();
  } catch (error) {
    // This renders inside the root shell, so an uncaught Neon failure would
    // 500 every page on the site rather than dropping one bar. Suspense does
    // not catch throws — only suspensions — so the try/catch is load-bearing.
    rethrowControlFlow(error);
    console.error("[EventStrip] could not resolve the featured event:", error);
    return null;
  }

  if (!featured) return null;

  const { event, competitionName, competitionSlug, isLive } = featured;
  const where = [event.venue, event.city].filter(Boolean).join(", ");

  return (
    <div className="border-line bg-surface/60 border-b">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 text-xs md:px-6">
        {/* Which league. Never omitted — see the note above. */}
        <Link
          href={`/competitions/${competitionSlug}`}
          className="text-ink-dim hover:text-ink-muted font-display shrink-0 font-semibold tracking-wide uppercase transition-colors"
        >
          {isLive ? (
            <span className="text-live inline-flex items-center gap-1.5">
              <span className="bg-live size-1.5 animate-pulse rounded-full" />
              Live
            </span>
          ) : (
            "Next"
          )}
          <span className="text-ink-dim/60"> · </span>
          {competitionName}
        </Link>

        <Link
          href={`/events/${event.slug}`}
          className="text-ink hover:text-volt min-w-0 truncate font-medium transition-colors"
        >
          {event.name}
        </Link>

        {where ? (
          <span className="text-ink-dim hidden truncate lg:inline">{where}</span>
        ) : null}

        {/* Pushed right on wide screens, wraps underneath on a phone. */}
        <div className="ml-auto flex items-center gap-4">
          {isLive ? null : event.startTimeTbd ? (
            // No countdown to an hour nobody announced. The date still reads,
            // via EventTime below.
            <span className="text-ink-muted">Date set, time TBA</span>
          ) : (
            <Countdown
              startsAt={event.startsAt.toISOString()}
              className="text-volt font-display font-semibold"
            />
          )}

          <EventTime
            startsAt={event.startsAt.toISOString()}
            timeZone={event.timezone}
            city={event.city}
            timeTbd={event.startTimeTbd}
            showDate={false}
            className="text-ink-dim hidden sm:inline"
          />

          {/* The where-to-watch link, promoted out of the event page. UFC
              gives this its own button in the nav and on every event row
              because rights are fragmented; almost every event here is on
              somebody else's channel, so it matters more. */}
          {event.broadcastUrl ? (
            <a
              href={event.broadcastUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted hover:text-volt inline-flex shrink-0 items-center gap-1 font-medium transition-colors"
            >
              <Tv className="size-3.5" />
              <span className="hidden sm:inline">
                {event.broadcastName?.trim() || "Where to watch"}
              </span>
            </a>
          ) : (
            <Link
              href={`/events/${event.slug}`}
              className="text-ink-muted hover:text-volt inline-flex shrink-0 items-center gap-0.5 font-medium transition-colors"
            >
              {isLive ? "Watch" : "Fight card"}
              <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
