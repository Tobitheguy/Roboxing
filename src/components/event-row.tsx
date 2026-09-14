import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Tv } from "lucide-react";

import { ConfidenceBadge } from "@/components/confidence-badge";
import { Countdown } from "@/components/countdown";
import { EventDate } from "@/components/event-date";
import { LeagueMarkBadge } from "@/components/league-mark";
import { LivePill } from "@/components/live-pill";
import { getMachineMedia } from "@/lib/machine-media";
import type { BoutDetail } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ConfidenceValue } from "@/db/schema";

/**
 * One event, as a row.
 *
 * THE SHAPE IS UFC'S EVENTS LIST, WHICH TOBIAS ASKED FOR BY NAME.
 *
 *   [machine] [machine]   WHITE EAGLE VS MATADOR          [ Fight card   → ]
 *                         Thu, Jul 16, 2026 · Time TBA    [ Where to watch ]
 *                         Shenzhen Nanshan Sports Center
 *                         Shenzhen · CN
 *
 * A horizontal row in a vertical list, not a tile in a grid: photography left,
 * one headline with a stack of metadata under it, actions pinned right. The
 * thing that makes their page read as clean is not the styling — it is that
 * the row carries the event's IDENTITY and nothing else, and the card itself
 * lives one click away. Ours used to print the full bout list inside every
 * schedule entry, which on a schedule is mostly "Card not announced" repeated
 * down the page.
 *
 * WHAT IS DELIBERATELY NOT COPIED.
 *
 * Tickets. Tobias called it irrelevant and he is right — nobody is selling
 * seats to these yet, and a dead button is worse than no button.
 *
 * And the matchup headline, which is where their design assumes something this
 * sport does not provide. UFC can always print "A vs B" because every card is
 * paired weeks out. Here, MOST events are announced as a number of bouts with
 * no pairings at all, and a row that filled that gap with two placeholder
 * names would be a fabricated fight card in the biggest type on the page. So:
 * paired main event → their headline. Unpaired → the event's own name, which
 * is the most specific true thing available.
 *
 * The photography follows the same rule. Two machines appear only when the
 * main event is paired AND both machines have a photograph on file. One
 * missing photo means neither is shown, because one cut-out facing an empty
 * cell reads as a loading failure.
 */

export type EventRowData = {
  slug: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  dateTbd: boolean;
  dateLabel: string | null;
  startTimeTbd: boolean;
  city: string | null;
  country: string | null;
  venue: string | null;
  confidence: ConfidenceValue;
  note: string | null;
  status: string;
  broadcastUrl: string | null;
  broadcastName: string | null;
};

export function EventRow({
  event,
  competitionName,
  competitionSlug,
  competitionLogoUrl,
  boutCount,
  bouts,
  /** Hide the countdown on pages about the past, where it is nonsense. */
  showCountdown = true,
  className,
}: {
  event: EventRowData;
  competitionName: string;
  competitionSlug: string;
  competitionLogoUrl?: string | null;
  boutCount: number;
  bouts: BoutDetail[];
  showCountdown?: boolean;
  className?: string;
}) {
  /*
   * The main event is the LAST bout — a card is built to finish on its biggest
   * fight, so bout one is the opener. Same rule as the poster and the social
   * card; it is stated in three places because getting it backwards would
   * quietly promote the curtain-jerker everywhere at once.
   */
  const headline = bouts.length > 0 ? bouts[bouts.length - 1] : null;
  const photoA = headline ? getMachineMedia(headline.robotA.slug)?.card : null;
  const photoB = headline ? getMachineMedia(headline.robotB.slug)?.card : null;
  const showFaces = Boolean(photoA && photoB);

  const matchup = headline
    ? `${headline.robotA.name} vs ${headline.robotB.name}`
    : null;

  const location = [event.city, event.country].filter(Boolean).join(" · ");
  const isLive = event.status === "live";

  return (
    <article
      className={cn(
        "border-line bg-surface hover:border-line-strong border-2 transition-colors",
        className,
      )}
    >
      {/* The league strip. Mark, name, and how firm the listing is — the one
          piece of metadata this site has that UFC's rows do not need. */}
      <div className="border-line flex items-center gap-3 border-b-2 px-4 py-2.5 sm:px-5">
        <LeagueMarkBadge
          slug={competitionSlug}
          name={competitionName}
          logoUrl={competitionLogoUrl}
          size="sm"
        />
        <Link
          href={`/competitions/${competitionSlug}`}
          className="ticker text-ink-muted hover:text-volt min-w-0 truncate transition-colors"
        >
          {competitionName}
        </Link>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {isLive ? <LivePill status="live" /> : null}
          <ConfidenceBadge level={event.confidence} />
        </span>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        {/* The machines, facing each other across the 2px rule — the same
            grammar as the fight poster, at row scale. */}
        {showFaces && photoA && photoB ? (
          <Link
            href={`/events/${event.slug}`}
            aria-hidden
            tabIndex={-1}
            className="border-line divide-line flex shrink-0 divide-x-2 border-2"
          >
            {[photoA, photoB].map((photo, i) => (
              <span
                key={i}
                className="bg-surface-2 relative block size-24 overflow-hidden sm:size-28"
              >
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </span>
            ))}
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-ink text-xl leading-none uppercase sm:text-2xl">
            <Link
              href={`/events/${event.slug}`}
              className="hover:text-volt transition-colors"
            >
              {matchup ?? event.name}
            </Link>
          </h3>

          {/* When the headline is the matchup, the event's own name drops to
              the meta line — otherwise the row never says which event this is.
              When the headline IS the event name, printing it twice is noise. */}
          <p className="text-ink-muted mt-2 text-sm">
            {matchup ? (
              <>
                <span className="text-ink-dim">{event.name}</span>
                {" · "}
              </>
            ) : null}
            <EventDate
              startsAt={event.startsAt}
              endsAt={event.endsAt}
              timeZone={event.timezone}
              city={event.city}
              dateTbd={event.dateTbd}
              dateLabel={event.dateLabel}
              startTimeTbd={event.startTimeTbd}
            />
          </p>

          {event.venue ? (
            <p className="text-ink-dim mt-1 text-xs">{event.venue}</p>
          ) : null}
          {location ? (
            <p className="text-ink-dim mt-0.5 text-xs">{location}</p>
          ) : null}

          {/* The caveat, which on this schedule is frequently worth more than
              the date — a season listed as running to March 2027 when the
              organiser's own site says 2027 to 2027 is a typo, not a fixture. */}
          {event.note ? (
            <p className="text-ink-dim mt-2 max-w-xl text-xs leading-relaxed">
              {event.note}
            </p>
          ) : null}
        </div>

        {/* Actions, pinned right and both the same width so their edges line
            up — the detail that makes UFC's column read as a column. */}
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-52">
          {showCountdown && !event.dateTbd && !event.startTimeTbd && !event.endsAt ? (
            <Countdown
              startsAt={event.startsAt.toISOString()}
              className="font-display text-volt mb-1 text-lg leading-none"
            />
          ) : null}

          <Link
            href={`/events/${event.slug}`}
            className="border-volt bg-volt text-volt-ink hover:bg-volt-dim control-h flex items-center justify-between gap-2 border-2 px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors"
          >
            Fight card
            <ArrowRight className="size-3.5 shrink-0" />
          </Link>

          {/*
           * "Where to watch", and the destination depends on what is known.
           *
           * A broadcaster URL on the event goes straight there. Without one,
           * the link lands on /watch filtered to this league, which is a real
           * answer — every league on this site has at least one channel — and
           * not the apology a disabled button would be.
           */}
          {event.broadcastUrl ? (
            <a
              href={event.broadcastUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-line text-ink-muted hover:border-volt hover:text-ink control-h flex items-center justify-between gap-2 border-2 px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors"
            >
              <span className="min-w-0 truncate">
                {event.broadcastName?.trim() || "Where to watch"}
              </span>
              <Tv className="size-3.5 shrink-0" />
            </a>
          ) : (
            <Link
              href={`/watch#${competitionSlug}`}
              className="border-line text-ink-muted hover:border-volt hover:text-ink control-h flex items-center justify-between gap-2 border-2 px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors"
            >
              Where to watch
              <Tv className="size-3.5 shrink-0" />
            </Link>
          )}

          <p className="text-ink-dim tabular text-center text-xs">
            {boutCount === 0
              ? "Card not announced"
              : `${boutCount} ${boutCount === 1 ? "bout" : "bouts"}`}
          </p>
        </div>
      </div>
    </article>
  );
}
