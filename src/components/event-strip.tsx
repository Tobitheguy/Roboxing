import Link from "next/link";
import { connection } from "next/server";
import { Tv } from "lucide-react";

import { dateZone } from "@/components/event-date";
import { formatDate, formatTimeWithZone } from "@/lib/format";
import { getFeaturedEvent } from "@/lib/queries";
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

  if (live.length > 0) {
    const channel = live[0];
    return (
      <div className="border-line bg-surface ticker border-b-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 md:px-6">
          <Link
            href={`/competitions/${channel.competitionSlug}`}
            className="shrink-0 text-current transition-opacity hover:opacity-70"
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
  /*
   * Plain words, not machine-speak.
   *
   * This read "NEXT_EVT UFB-S2 · DATE_TBA" because the prototype's ticker is
   * styled as instrumentation. On the prototype that is a look; on a live site
   * it is a strip of jargon above every page, and Tobias's reaction was the
   * correct one. The texture stays — monospace, uppercase, fixed order — and
   * the words are words.
   */
  const lead = isLive
    ? `● Live — ${event.name}`
    : event.dateTbd
      ? `Next · ${competitionName} · ${event.dateLabel?.trim() || "date to be announced"}`
      : `Next · ${competitionName} · ${event.name}`;

  /*
   * The date read in the VENUE's calendar, except for date-only rows, where
   * there is no announced instant to convert and the venue's zone would file
   * a 1 October season under September. Same rule as `dateZone` on the
   * schedule; stated again here because this bar renders on every page and
   * getting it wrong would be wrong everywhere at once.
   */
  const whenWhere = [
    event.dateTbd
      ? event.dateLabel?.trim() || "Date TBA"
      : formatDate(event.startsAt, dateZone(event.timezone, event.startTimeTbd)),
    event.dateTbd || event.startTimeTbd
      ? "Time TBA"
      : formatTimeWithZone(event.startsAt, event.timezone),
    [event.city, event.country].filter(Boolean).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    /* A filled bar, not a dim rule. It was steel-on-charcoal and disappeared
       into the header above it; as a solid band it reads as the one piece of
       standing information on the page. Red when a league is live — the only
       place that colour is allowed — and cyan otherwise, with dark ink on top
       because cyan at full strength cannot carry white text. */
    <div
      /* NOT the `ticker` utility here. That utility sets its own colour
         (--color-ink-dim), which lands in the same cascade layer as the text
         colour below and can win depending on source order — the result is
         steel text on a cyan field, which is what "unleserlich weil es auch in
         blau ist" describes. On a coloured bar the type spec is applied
         directly and the colour is stated once, with nothing to override it. */
      className={cn(
        "font-mono border-b-2 text-[0.75rem] tracking-[0.08em] uppercase",
        isLive ? "border-live bg-live" : "border-volt bg-volt",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 md:px-6",
          isLive ? "text-white" : "text-volt-ink",
        )}
      >
        {/* `text-current`, explicitly. The base layer paints every anchor cyan,
            and on a cyan bar that is cyan on cyan — the lead text vanished
            entirely. Same trap as the headings and the wordmark: on this site
            far more things are anchors than the prototype assumed. */}
        <Link
          href={`/events/${event.slug}`}
          className="min-w-0 truncate font-bold text-current transition-opacity hover:opacity-70"
        >
          {lead}
        </Link>

        {/*
         * WHEN AND WHERE, NOT HOW BIG WE ARE.
         *
         * This read "8 leagues · 2 results · 10 machines" — three counts about
         * the site, on a bar above every page, and one of them was the number
         * 2. Inventory is not news. Nobody arrives wanting to know how many
         * machines we have on file, and advertising a two-row results table is
         * the opposite of a reason to stay.
         *
         * The left half already names what is next. This half finishes the
         * sentence: the date, the time, and where it is happening. A field
         * with no value prints its absence — "Time TBA" rather than nothing,
         * because a missing time reads as a time nobody bothered to show.
         */}
        <span className="hidden shrink-0 sm:inline">{whenWhere}</span>
      </div>
    </div>
  );
}
