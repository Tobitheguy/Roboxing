import Link from "next/link";
import { connection } from "next/server";
import { Tv } from "lucide-react";

import { getFeaturedEvent, getRecordCounts } from "@/lib/queries";
import { rethrowControlFlow } from "@/lib/next-errors";
import { cn } from "@/lib/utils";
import { getLiveChannels } from "@/lib/twitch";

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
 *
 * THREE STATES, in priority order:
 *   1. A league is live on its own channel (Twitch) — outranks everything,
 *      because it is happening now and it is the only thing here that changes
 *      on a day nothing was scheduled.
 *   2. One of OUR events is flagged live in the database.
 *   3. The next fixture, dated ones first.
 */
export async function EventStrip() {
  // Request-time, not build-time. Without this the strip is prerendered into
  // static HTML and freezes on whatever was next at deploy — which on a site
  // whose whole job is "what is on" is worse than having no strip.
  await connection();

  /*
   * Somebody else's stream, checked first.
   *
   * A league going live on its own channel outranks our calendar: it is
   * happening NOW, and it is the only thing on this site that changes on a day
   * nothing was scheduled. Returns an empty list without credentials, so an
   * unconfigured deployment simply falls through to the fixture below.
   */
  let live: Awaited<ReturnType<typeof getLiveChannels>> = [];
  try {
    live = await getLiveChannels();
  } catch (error) {
    rethrowControlFlow(error);
    console.error("[EventStrip] live check failed:", error);
  }

  const counts = await getRecordCounts();

  if (live.length > 0) {
    const channel = live[0];
    return (
      <div className="border-line bg-surface ticker border-b-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 md:px-6">
          <Link
            href={`/competitions/${channel.competitionSlug}`}
            className="hover:text-ink-muted shrink-0 transition-colors"
          >
            {/* The one place red is allowed. See the token note in
                globals.css: --color-live means broadcasting and nothing else,
                so this strip is the whole reason it exists. */}
            <span className="text-live inline-flex items-center gap-1.5">
              <span className="bg-live size-1.5 animate-pulse rounded-full" />
              Live
            </span>
            <span className="text-ink-dim/60"> · </span>
            {channel.competitionName}
          </Link>

          <a
            href={channel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink hover:text-volt min-w-0 truncate font-medium transition-colors"
          >
            {channel.title}
          </a>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-ink-dim tabular hidden sm:inline">
              {`${channel.viewers.toLocaleString("en-US")} watching`}
            </span>
            <a
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted hover:text-volt inline-flex shrink-0 items-center gap-1 font-medium transition-colors"
            >
              <Tv className="size-3.5" />
              {channel.name.replace(/^Twitch — /, "")}
            </a>
          </div>
        </div>
      </div>
    );
  }

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

  const { event, competitionName, isLive } = featured;

  /*
   * The telemetry strip.
   *
   * DIR_03's house texture: a monospace rule carrying, in a fixed order, what
   * is next and what the record holds. Every field is data the record already
   * has — never an invented id, never a number nobody computed — and a field
   * with no value prints its absence rather than collapsing, which is why an
   * undated fixture reads DATE_TBA instead of disappearing.
   *
   * Never animated. It is a label on a machine, not a screensaver.
   */
  const lead = isLive
    ? `● LIVE — ${event.name}`
    : event.dateTbd
      ? `NEXT_EVT ${competitionName} · ${event.dateLabel?.trim() || "DATE_TBA"}`
      : `NEXT_EVT ${competitionName} · ${event.name}`;

  return (
    <div className="border-line bg-surface ticker border-b-2">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 md:px-6">
        <Link
          href={`/events/${event.slug}`}
          className={cn(
            "min-w-0 truncate transition-colors",
            isLive ? "text-live" : "hover:text-ink-muted",
          )}
        >
          {lead}
        </Link>

        <span className="hidden shrink-0 sm:inline">
          {`${counts.leagues} leagues on record`}
        </span>
        <span className="hidden shrink-0 md:inline">
          {`${counts.results} results`}
        </span>
        <Link
          href="/open-questions"
          className="hover:text-ink-muted hidden shrink-0 transition-colors lg:inline"
        >
          {`${counts.openQuestions} open questions`}
        </Link>
        <span className="hidden shrink-0 lg:inline">
          {`${counts.machines} machines`}
        </span>
      </div>
    </div>
  );
}
