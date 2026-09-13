import Image from "next/image";

import { ChannelPill } from "@/components/channel-pill";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { getMachineMedia } from "@/lib/machine-media";
import type { BoutDetail } from "@/lib/queries";
import type { ConfidenceValue, WatchChannel } from "@/db/schema";

/**
 * The fight poster — what an event page shows when there is nothing to play.
 *
 * WHAT THIS REPLACES, AND WHY.
 * The page used to render a 16:9 player frame containing the words "Not
 * playing · There is nothing to play for this event yet." For an event three
 * weeks away that is a black rectangle apologising for itself, and it is the
 * first thing on the page. Tobias's verdict: "eine seite mit einem player der
 * nix zeigt ist scheisse".
 *
 * He is right, and the fix is not a better empty state — it is a different
 * object. Before a fight, the thing a poster has always done is tell you WHO,
 * WHEN, WHERE and HOW TO SEE IT. So that is what this is: the two machines
 * with their real photographs, the date, the venue, and the channels that will
 * carry it.
 *
 * WHAT IT REFUSES TO DO.
 * It will not invent a matchup. Most fight cards in this sport are announced
 * as a number of bouts with no pairings — "five bouts, none paired" is the
 * normal state — and a poster that fills that with placeholder names would be
 * a fabricated card. When there are no bouts it says so, in the same words the
 * schedule uses.
 */
export function EventPoster({
  competitionName,
  city,
  country,
  venue,
  dateTbd,
  startTimeTbd,
  confidence,
  note,
  bouts,
  channels,
  posterUrl,
}: {
  competitionName: string;
  city: string | null;
  country: string | null;
  venue: string | null;
  dateTbd: boolean;
  startTimeTbd: boolean;
  confidence: ConfidenceValue;
  note: string | null;
  bouts: BoutDetail[];
  channels: WatchChannel[];
  posterUrl: string | null;
}) {
  // The main event is the LAST bout — a card is built to finish on its biggest
  // fight, so bout one is the opener.
  const headline = bouts.length > 0 ? bouts[bouts.length - 1] : null;
  void [venue, city, country];

  const corner = (robot: BoutDetail["robotA"] | undefined, align: "l" | "r") => {
    const photo = robot ? getMachineMedia(robot.slug)?.card : null;
    return (
      <div
        className={`flex min-w-0 flex-1 flex-col ${align === "r" ? "items-end text-right" : "items-start"}`}
      >
        <div className="border-line bg-surface-2 relative aspect-square w-full max-w-[220px] overflow-hidden border-2">
          {photo ? (
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="220px"
              className="grayscale-photo object-cover"
            />
          ) : (
            <div className="text-ink-dim font-display flex size-full items-center justify-center text-4xl">
              {robot ? robot.name.charAt(0) : "?"}
            </div>
          )}
        </div>
        <p className="font-display text-ink mt-3 text-2xl sm:text-3xl">
          {robot ? robot.name : "TBA"}
        </p>
        <p className="text-ink-muted mt-1 text-sm">
          {robot ? robot.teamName : "Not paired"}
        </p>
        {robot?.pilotName ? (
          <p className="text-ink-dim mt-0.5 text-xs">
            {`Piloted by ${robot.pilotName}`}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="border-line bg-surface border-2">
      {/* The ticker rule: league, status, source count. Fixed order, and a
          field with no value prints its absence rather than collapsing. */}
      <div className="border-line ticker flex flex-wrap justify-between gap-x-6 gap-y-1 border-b-2 px-4 py-2 sm:px-6">
        <span>{competitionName}</span>
        <span>{startTimeTbd || dateTbd ? "TIME_TBA" : "SCHEDULED"}</span>
        <span>
          {channels.length > 0 ? `SRC×${channels.length}` : "NO CHANNEL LISTED"}
        </span>
      </div>

      <div className="p-6 sm:p-8">
        {/* No title and no date here: the page header two lines above already
            carries both, and a poster that repeats them reads as a rendering
            bug. What the header does NOT carry is the confidence of the
            listing, so that stays. */}
        {confidence !== "confirmed" ? (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <ConfidenceBadge level={confidence} />
            <span className="text-ink-dim text-xs">
              How firm this listing is
            </span>
          </div>
        ) : null}

        {/* The matchup, or an honest statement that there is not one yet. */}
        <div className="border-line mt-8 border-t-2 pt-8">
          {headline ? (
            <div className="flex items-start gap-4 sm:gap-8">
              {corner(headline.robotA, "l")}
              <div className="font-display text-ink-dim pt-16 text-2xl sm:text-3xl">
                V
              </div>
              {corner(headline.robotB, "r")}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="font-display text-ink text-2xl">
                Card not announced
              </p>
              <p className="text-ink-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">
                {note ??
                  "The organiser has not published pairings. This page fills in the moment they do — nothing here is a guess."}
              </p>
            </div>
          )}
        </div>

        {/* Where to see it. The other half of what a poster is for. */}
        <div className="border-line mt-8 border-t-2 pt-6">
          <p className="eyebrow mb-3">Where to watch</p>
          {channels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {channels.map((channel) => (
                <ChannelPill
                  key={channel.id}
                  name={channel.name}
                  url={channel.url}
                />
              ))}
            </div>
          ) : (
            <p className="text-ink-muted text-sm">
              No channel has been announced for this event.
            </p>
          )}
        </div>
      </div>

      {/* The promoter's own artwork, when they have released any. Below the
          facts rather than behind them: a poster nobody can read is decoration,
          and this block's job is the date and the matchup. */}
      {posterUrl ? (
        <div className="border-line relative aspect-[16/9] border-t-2">
          <Image
            src={posterUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 900px, 100vw"
            className="grayscale-photo object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}
