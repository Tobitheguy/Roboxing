import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { EventPoster } from "@/components/event-poster";
import { AddToCalendar } from "@/components/add-to-calendar";
import { Badge } from "@/components/badge";
import { Countdown } from "@/components/countdown";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageShell } from "@/components/page-shell";
import {
  PredictionCard,
  type PickableBout,
} from "@/components/prediction-card";
import { WatchExperience } from "@/components/watch-experience";
import { checkEventAccess } from "@/lib/access";
import { getAppUrl } from "@/lib/app-url";
import { getViewer } from "@/lib/auth";
import { toParagraphs } from "@/lib/embeds";
import { arePicksOpen, gradePrediction, picksClosedReason } from "@/lib/predictions";
import { PostCard } from "@/components/post-card";
import {
  getBoutsForEvent,
  getCrowdPicksForEvent,
  getEventBySlug,
  getPostsForEvent,
  getStreamForEvent,
  getUserPicksForEvent,
  getWatchChannelsFor,
} from "@/lib/queries";
import { createSignedToken, hlsUrl, isStreamConfigured } from "@/lib/stream";

/**
 * The canonical page for one event, ours or not.
 *
 * It used to live at `/watch/[slug]`, and the rename is not cosmetic. That URL
 * promised a player, and most events on this site are somebody else's — there
 * is nothing here to watch, only a card, results and a link to the organizer's
 * own channel. `/watch/` for those is a lie told in the address bar, and it is
 * also the wrong thing to hand a search engine or paste into a social post.
 *
 * `/watch/[slug]` still resolves; it redirects here.
 */

export async function generateMetadata(
  props: PageProps<"/events/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const row = await getEventBySlug(slug);
  if (!row) return { title: "Event" };

  const { event, competitionName } = row;
  const where = [event.venue, event.city, event.country]
    .filter(Boolean)
    .join(", ");

  return {
    title: event.name,
    description: [
      `${competitionName} — ${event.name}.`,
      where || null,
      "Full card, results and standings on Roboxing.",
    ]
      .filter(Boolean)
      .join(" "),
    // The page is public and its whole job is to be shared. Without these an
    // event link posted to X or Discord unfurls as a bare URL, which is a
    // measurable difference in whether anyone clicks it.
    openGraph: {
      type: "website",
      title: `${event.name} — ${competitionName}`,
      url: `${getAppUrl()}/events/${event.slug}`,
      /*
       * `images` is spread in only when there IS a poster, and the difference
       * matters: writing `images: undefined` still counts as setting the key,
       * and an explicitly-set key beats the `opengraph-image.tsx` file
       * convention. The result was an event page with no og:image at all —
       * not the generated card, and not even the site-wide fallback.
       *
       * Present and absent, not present-and-undefined. When a promoter's own
       * artwork exists it should win; otherwise the generated result card
       * fills in.
       */
      ...(event.posterUrl ? { images: [{ url: event.posterUrl }] } : {}),
    },
  };
}

type PlaybackResult = {
  url: string | null;
  reason?: string;
  direct?: boolean;
  /** Set when access was refused, so the UI can offer the right button. */
  blocked?: "sign_in_required" | "subscription_required";
};

/**
 * Resolve what this event should play right now.
 *
 * A live event plays its input; a finished one plays the recording Cloudflare
 * produced when the broadcast ended. Both at the same URL — a viewer who
 * bookmarks the page during the fight finds the replay there afterwards, which
 * is the whole reason the route is not split into /live and /replay.
 *
 * Never called for an event with a `broadcastUrl`; see the caller.
 */
async function resolvePlayback(event: {
  id: number;
  status: string;
  access: "free" | "subscription";
  startsAt: Date;
  allowedCountries: string[] | null;
}): Promise<PlaybackResult> {
  const { id: eventId, status, allowedCountries } = event;

  // Entitlement before anything else. Resolving a URL first and hiding it in
  // the UI would still put a working manifest in the page's payload.
  const decision = await checkEventAccess({ id: event.id, access: event.access });
  if (!decision.allowed) {
    return {
      url: null,
      blocked: decision.reason,
      reason:
        decision.reason === "sign_in_required"
          ? "Sign in to watch this event."
          : "This event is included with a Roboxing subscription.",
    };
  }

  const stream = await getStreamForEvent(eventId);

  // A directly-supplied HLS manifest wins over everything else.
  //
  // Two real uses: verifying the player against a public test stream without
  // paying for a Stream subscription there is nothing yet to broadcast into,
  // and the case where a rights holder hands over a plain HLS URL rather than
  // an RTMP feed to restream. Neither needs signing, because neither is a
  // Cloudflare asset we control.
  if (stream?.cfPlaybackHlsUrl) {
    return { url: stream.cfPlaybackHlsUrl, direct: true };
  }

  if (status === "scheduled") {
    return { url: null, reason: "This event has not started yet." };
  }
  if (status === "cancelled") {
    return { url: null, reason: "This event was cancelled." };
  }

  if (!stream) {
    return {
      url: null,
      reason: "No broadcast has been set up for this event yet.",
    };
  }

  if (!isStreamConfigured()) {
    return {
      url: null,
      reason: "Streaming is not configured on this deployment.",
    };
  }

  const uid =
    status === "completed" && stream.cfRecordingUid
      ? stream.cfRecordingUid
      : stream.cfLiveInputId;

  if (!uid) {
    return {
      url: null,
      reason:
        status === "completed"
          ? "The recording for this event is not ready yet."
          : "The broadcast has not connected yet.",
    };
  }

  try {
    const token = await createSignedToken(uid, { allowedCountries });
    return { url: hlsUrl(token) };
  } catch (error) {
    // A Cloudflare outage must not take the page down — the card and the
    // results are still worth showing.
    console.error("[event] could not mint playback URL:", error);
    return { url: null, reason: "The stream is temporarily unavailable." };
  }
}

export default async function EventPage(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params;
  const row = await getEventBySlug(slug);
  if (!row) notFound();

  const { event, competitionSlug, competitionName } = row;
  const external = event.broadcastUrl?.trim() || null;

  const [bouts, coverage, channels, playback] = await Promise.all([
    getBoutsForEvent(event.id),
    getPostsForEvent(event.id),
    getWatchChannelsFor(event.competitionId),
    // Skipped entirely for an external broadcast. Not an optimisation: this
    // call mints a signed Cloudflare token and applies the paywall, and doing
    // either for an event we do not carry would gate a page whose video is
    // free on somebody else's site.
    external
      ? Promise.resolve<PlaybackResult>({ url: null })
      : resolvePlayback({
          id: event.id,
          status: event.status,
          access: event.access,
          startsAt: event.startsAt,
          allowedCountries: event.allowedCountries,
        }),
  ]);

  const isScheduled = event.status === "scheduled";
  const location = [event.venue, event.city, event.country]
    .filter(Boolean)
    .join(", ");

  /* ---- Predictions -------------------------------------------------- */

  // Signed out is the normal case on a public page, not a failure. The crowd
  // split still renders; only the buttons are swapped for a sign-in prompt.
  const viewer = await getViewer();
  const picksOpen = arePicksOpen({
    startsAt: event.startsAt,
    status: event.status,
  });

  const [myPicks, crowdPicks] = await Promise.all([
    viewer
      ? getUserPicksForEvent(viewer.id, event.id)
      : Promise.resolve(new Map<number, number>()),
    getCrowdPicksForEvent(event.id),
  ]);

  const pickableBouts: PickableBout[] = bouts.map((bout) => {
    const counts = crowdPicks.get(bout.id);
    const myPick = myPicks.get(bout.id) ?? null;

    return {
      boutId: bout.id,
      orderIndex: bout.orderIndex,
      robotA: {
        id: bout.robotA.id,
        name: bout.robotA.name,
        teamName: bout.robotA.teamName,
      },
      robotB: {
        id: bout.robotB.id,
        name: bout.robotB.name,
        teamName: bout.robotB.teamName,
      },
      myPick,
      countA: counts?.get(bout.robotA.id) ?? 0,
      countB: counts?.get(bout.robotB.id) ?? 0,
      // A bout nobody picked grades as "pending" for this viewer — there is
      // nothing of theirs to grade, and marking it wrong would punish them
      // for not playing.
      grade: myPick === null ? "pending" : gradePrediction(myPick, bout.result),
      winnerRobotId: bout.result?.winnerRobotId ?? null,
    };
  });

  return (
    <PageShell>
      {/* Back to where this event actually belongs. It always said "Schedule",
          so arriving from the results page and pressing back landed you on a
          calendar you had not come from. */}
      <BackLink
        href={event.status === "completed" ? "/results" : "/schedule"}
        label={event.status === "completed" ? "Results" : "Schedule"}
      />
      <div className="mb-6">
        <p className="eyebrow mb-2">
          <Link
            href={`/competitions/${competitionSlug}`}
            className="hover:text-volt transition-colors"
          >
            {competitionName}
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display text-hero text-ink uppercase">
            {event.name}
          </h1>
          {event.status === "live" ? <LivePill status="live" /> : null}
          {event.status === "cancelled" ? (
            <Badge variant="danger">Cancelled</Badge>
          ) : null}
        </div>
        <p className="text-ink-muted mt-3 text-sm">
          <EventTime
            startsAt={event.startsAt.toISOString()}
            timeZone={event.timezone}
            city={event.city}
            timeTbd={event.startTimeTbd}
          />
          {location ? <span className="text-ink-dim"> · {location}</span> : null}
        </p>
      </div>

      <WatchExperience
        eventSlug={event.slug}
        initialBouts={bouts}
        initialEventStatus={event.status}
        playbackUrl={playback.url}
        posterUrl={event.posterUrl}
        unavailableReason={playback.reason}
        // A direct URL is not ours to re-sign, so the player must not try.
        directSource={playback.direct ?? false}
        blocked={playback.blocked}
        externalBroadcast={
          external ? { url: external, name: event.broadcastName } : undefined
        }
        /* Nothing to play is not an error — for most events on this site it is
           the normal state, and it lasts for weeks. A poster is the object that
           belongs there: who, when, where, and how to see it. */
        fallback={
          <EventPoster
            eventSlug={event.slug}
            competitionName={competitionName}
            city={event.city}
            country={event.country}
            venue={event.venue}
            dateTbd={event.dateTbd}
            startTimeTbd={event.startTimeTbd}
            confidence={event.confidence}
            note={event.note}
            bouts={bouts}
            channels={channels}
            posterUrl={event.posterUrl}
          />
        }
      />

      {/* The result, when it is known but not enterable as a card.
          Immediately under the player because it IS the card for this event —
          WatchExperience above renders an empty bout list, and a visitor who
          reads that as "no result" has been misinformed. See
          `events.results_summary`. */}
      {event.resultsSummary?.trim() ? (
        <div className="border-line bg-surface mt-6 rounded-lg border p-4 sm:p-6">
          <h2 className="font-display text-ink mb-3 text-sm font-semibold uppercase">
            Reported result
          </h2>
          <div className="max-w-2xl space-y-3">
            {toParagraphs(event.resultsSummary).map((paragraph, i) => (
              <p key={i} className="text-ink-muted text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="text-ink-dim mt-4 text-xs">
            Recorded as prose because this site&rsquo;s table pairs two named
            robots, and the machines in this one were not named. The card goes in
            when they are.
          </p>
        </div>
      ) : null}

      {isScheduled ? (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* No countdown when the start time was never announced. A clock
              ticking down to a time nobody published is a fabricated
              precision, and it is the most confident-looking element on the
              page. */}
          {event.startTimeTbd ? null : (
            <Countdown
              startsAt={event.startsAt.toISOString()}
              className="font-display text-volt text-2xl font-bold"
            />
          )}
          <AddToCalendar
            eventSlug={event.slug}
            eventName={event.name}
            competitionName={competitionName}
            startsAt={event.startsAt}
            location={location}
            appUrl={getAppUrl()}
            allDay={event.startTimeTbd}
            timeZone={event.timezone}
          />
        </div>
      ) : null}

      {/* Below the player and the card, above the source note. Someone who
          opened this page mid-broadcast wants the video first; someone who
          opened it three days early scrolls, and this is what they came to
          do. */}
      <div className="mt-6">
        <PredictionCard
          bouts={pickableBouts}
          open={picksOpen}
          closedReason={picksClosedReason({
            startsAt: event.startsAt,
            status: event.status,
          })}
          signedIn={Boolean(viewer)}
          eventSlug={event.slug}
        />
      </div>

      {/* The clips and the recap, on the event they belong to. This is the
          join that makes the site more than a feed: someone who arrives on a
          clip finds the card and the standings, and someone who arrives on
          the card finds the footage. */}
      {coverage.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-display text-title text-ink mb-4 uppercase">
            Coverage
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {coverage.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      ) : null}

      {event.sourceUrl ? (
        <p className="text-ink-dim mt-6 text-xs">
          Schedule reported by{" "}
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="hover:text-ink underline underline-offset-2"
          >
            the organizer
          </a>
          . Times can move — check the source before travelling.
        </p>
      ) : null}

    </PageShell>
  );
}
