import Image from "next/image";

import { ChannelPill } from "@/components/channel-pill";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { TwitchEmbed } from "@/components/twitch-embed";
import { twitchLogin } from "@/lib/twitch";
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
 * WHEN, WHERE and HOW TO SEE IT.
 *
 * ONE IMPLEMENTATION, TWO SURFACES.
 *
 * The matchup itself is `/api/social/matchup` — the same PNG that gets posted
 * to a feed, rendered here rather than rebuilt in HTML. The first version of
 * this component hand-built a second copy of that layout: two columns, a "V"
 * in the middle, different margins, its own idea of what goes under a name.
 * Two implementations of one card drift, and the drift stays invisible until
 * somebody puts them side by side — which, for a poster, happens the first
 * time a reader sees the post and then clicks through to the page.
 *
 * WHAT STAYS IN HTML, AND WHY IT IS NOT IN THE IMAGE.
 * Everything a reader needs to ACT on: the venue, the confidence of the
 * listing, and the channels, which have to be links. Text baked into a PNG
 * cannot be clicked, selected, translated or read aloud. So the image carries
 * the matchup and the page carries the facts — and the date appears in both,
 * deliberately, because a poster without a date is not a poster.
 *
 * WHAT IT REFUSES TO DO.
 * It will not invent a matchup. Most fight cards in this sport are announced
 * as a number of bouts with no pairings — "five bouts, none paired" is the
 * normal state — and a poster that fills that with placeholder names would be
 * a fabricated card. When there are no bouts there is no image, and the block
 * says so in the same words the schedule uses.
 */
export function EventPoster({
  eventSlug,
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
  eventSlug: string;
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
  const hasCard = bouts.length > 0;
  const where = [venue, city, country].filter(Boolean).join(" · ");

  /*
   * Split the directory in two: what we can play, and what we can only point
   * at. Deduplicated by login, because a league listing the same channel
   * twice must not render the same player twice.
   */
  const seenLogins = new Set<string>();
  const embeddable: { login: string; id: number; name: string; url: string }[] = [];
  const elsewhere: WatchChannel[] = [];
  for (const channel of channels) {
    const login = channel.url ? twitchLogin(channel.url) : null;
    if (login && channel.url && !seenLogins.has(login)) {
      seenLogins.add(login);
      embeddable.push({ login, id: channel.id, name: channel.name, url: channel.url });
    } else if (!login) {
      elsewhere.push(channel);
    }
  }

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

      {hasCard ? (
        /*
         * The card itself. `unoptimized` because this URL is already a
         * generated PNG at a fixed size — running it back through the image
         * optimiser re-encodes a file we just encoded, for nothing.
         *
         * Square rather than portrait: a 4:5 poster inside a page column
         * pushes everything below it off the first screen, and the square
         * format is the same layout with less letterbox.
         */
        <div className="border-line relative aspect-square w-full border-b-2 sm:aspect-[4/5] sm:max-h-[38rem]">
          <Image
            src={`/api/social/matchup?event=${encodeURIComponent(eventSlug)}&format=square`}
            alt={`${competitionName} — fight card`}
            fill
            sizes="(min-width: 1024px) 900px, 100vw"
            className="object-contain"
            unoptimized
            priority
          />
        </div>
      ) : null}

      <div className="p-6 sm:p-8">
        {!hasCard ? (
          <div className="border-line mb-8 border-b-2 pb-8 text-center">
            <p className="font-display text-ink text-2xl">Card not announced</p>
            <p className="text-ink-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">
              {note ??
                "The organiser has not published pairings. This page fills in the moment they do — nothing here is a guess."}
            </p>
          </div>
        ) : null}

        {/* The facts a reader acts on, in one row. Venue and confidence sit
            together because they answer the same question — how solid is
            this — and a listing nobody has confirmed is worth knowing before
            you plan an evening around it. */}
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="eyebrow">Where</dt>
            <dd className="text-ink mt-1 text-sm">
              {where || "Venue not announced"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">How firm this listing is</dt>
            <dd className="mt-1">
              <ConfidenceBadge level={confidence} />
            </dd>
          </div>
        </dl>

        {/* Where to see it. The other half of what a poster is for, and the
            half that cannot live inside a PNG. */}
        <div className="border-line mt-8 border-t-2 pt-6">
          <p className="eyebrow mb-3">Where to watch</p>

          {/*
           * THE STREAM PLAYS HERE, IT IS NOT LINKED TO.
           *
           * This section used to be a row of pills — including UFB's Twitch
           * channel, which sent a reader who came to watch the fight off to
           * twitch.tv. Tobias: "i want people to watch on our page and not go
           * to the pages of the league."
           *
           * So any twitch.tv channel on this league becomes the player, and
           * the pills below carry only what CANNOT be embedded as a live
           * stream: a YouTube channel, the organiser's site, an X account.
           * Those are still worth listing — they are where the VOD and the
           * announcements live — but they are a different question from
           * "where do I watch this", and the answer to that one is now on
           * this page.
           */}
          {embeddable.length > 0 ? (
            <div className="mb-5 grid gap-4">
              {embeddable.map((channel) => (
                <TwitchEmbed
                  key={channel.login}
                  login={channel.login}
                  channelName={channel.name}
                  competitionName={competitionName}
                  url={channel.url}
                />
              ))}
            </div>
          ) : null}

          {elsewhere.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {elsewhere.map((channel) => (
                <ChannelPill
                  key={channel.id}
                  name={channel.name}
                  url={channel.url}
                />
              ))}
            </div>
          ) : null}

          {embeddable.length === 0 && elsewhere.length === 0 ? (
            <p className="text-ink-muted text-sm">
              No channel has been announced for this event.
            </p>
          ) : null}
        </div>
      </div>

      {/* The promoter's own artwork, when they have released any. Below our
          card rather than instead of it: theirs is the marketing, ours is the
          record, and the reader came here for the second one. */}
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
