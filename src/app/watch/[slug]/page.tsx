import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCalendar } from "@/components/add-to-calendar";
import { Badge } from "@/components/badge";
import { Countdown } from "@/components/countdown";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageShell } from "@/components/page-shell";
import { WatchExperience } from "@/components/watch-experience";
import { getAppUrl } from "@/lib/app-url";
import {
  getBoutsForEvent,
  getEventBySlug,
  getStreamForEvent,
} from "@/lib/queries";
import { createSignedToken, hlsUrl, isStreamConfigured } from "@/lib/stream";

export async function generateMetadata(
  props: PageProps<"/watch/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const row = await getEventBySlug(slug);
  return {
    title: row?.event.name ?? "Watch",
    description: row
      ? `${row.competitionName} — ${row.event.name}. Full card, results, and live stream.`
      : undefined,
  };
}

/**
 * Resolve what this event should play right now.
 *
 * A live event plays its input; a finished one plays the recording Cloudflare
 * produced when the broadcast ended. Both at the same URL — a viewer who
 * bookmarks the page during the fight finds the replay there afterwards, which
 * is the whole reason the route is not split into /live and /replay.
 */
async function resolvePlayback(
  eventId: number,
  status: string,
  allowedCountries: string[] | null,
): Promise<{ url: string | null; reason?: string }> {
  if (status === "scheduled") {
    return { url: null, reason: "This event has not started yet." };
  }
  if (status === "cancelled") {
    return { url: null, reason: "This event was cancelled." };
  }

  const stream = await getStreamForEvent(eventId);
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
    console.error("[watch] could not mint playback URL:", error);
    return { url: null, reason: "The stream is temporarily unavailable." };
  }
}

export default async function WatchEventPage(
  props: PageProps<"/watch/[slug]">,
) {
  const { slug } = await props.params;
  const row = await getEventBySlug(slug);
  if (!row) notFound();

  const { event, competitionSlug, competitionName } = row;
  const [bouts, playback] = await Promise.all([
    getBoutsForEvent(event.id),
    resolvePlayback(event.id, event.status, event.allowedCountries),
  ]);

  const isScheduled = event.status === "scheduled";
  const location = [event.venue, event.city, event.country]
    .filter(Boolean)
    .join(", ");

  return (
    <PageShell>
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
      />

      {isScheduled ? (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Countdown
            startsAt={event.startsAt.toISOString()}
            className="font-display text-volt text-2xl font-bold"
          />
          <AddToCalendar
            eventSlug={event.slug}
            eventName={event.name}
            competitionName={competitionName}
            startsAt={event.startsAt}
            location={location}
            appUrl={getAppUrl()}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
