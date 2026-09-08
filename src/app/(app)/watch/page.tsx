import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MonitorPlay, Tv } from "lucide-react";

import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { Countdown } from "@/components/countdown";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { youtubeThumbnailUrl } from "@/lib/embeds";
import { getLiveNow } from "@/lib/live";
import { getPublishedPosts, getUpcomingEvents } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Where to watch",
  description:
    "Where every humanoid robot fighting event actually streams — plus the footage worth watching from the last ones.",
};

/**
 * Where to watch.
 *
 * This page used to be called "Watch" and promise "live events play here" —
 * on a site that holds no broadcast rights and almost never carries the
 * video. The audit verdict was that the page was conceptually backwards, and
 * the fix is to answer the question people actually arrive with: WHERE is the
 * next event streaming, and where is the footage from the last one.
 *
 * So: upcoming events lead with their broadcaster as the primary action
 * (UFC's "How to watch" column, which exists there for the same reason —
 * fragmented rights), and the bottom half is our video coverage, which is the
 * closest thing to a replay this sport reliably produces. Our own player
 * still takes over the day an event is actually ours: the live banner at the
 * top comes from the same getLiveNow() the header uses.
 */
export default async function WatchIndexPage() {
  const [live, upcoming, posts] = await Promise.all([
    getLiveNow(),
    getUpcomingEvents(),
    getPublishedPosts(),
  ]);

  const videoPosts = posts.filter((p) => youtubeThumbnailUrl(p.post.embedUrl));

  return (
    <PageShell>
      <PageHeading
        eyebrow="Broadcast"
        title="Where to watch"
        description="Which channel carries each event — and the footage from the ones already fought."
      />

      {live ? (
        <Card className="border-live/30 mb-8">
          <div className="flex flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <LivePill status="live" className="mb-3" />
              <h2 className="font-display text-title text-ink uppercase">
                {live.eventName}
              </h2>
            </div>
            <Button asChild size="lg">
              <Link href={`/events/${live.eventSlug}`}>Watch live</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="mb-10">
        <CardHeader title="Upcoming" />
        <CardBodyFlush>
          {upcoming.length > 0 ? (
            <ul>
              {upcoming.map(({ event, competitionName }) => (
                <li
                  key={event.id}
                  className="border-line/60 border-b last:border-b-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="min-w-0">
                      <Link
                        href={`/events/${event.slug}`}
                        className="font-display text-ink hover:text-volt block truncate text-sm font-semibold uppercase transition-colors"
                      >
                        {event.name}
                      </Link>
                      <p className="text-ink-dim mt-1 text-xs">
                        {competitionName}
                        <span className="text-ink-dim"> · </span>
                        <EventTime
                          startsAt={event.startsAt.toISOString()}
                          timeZone={event.timezone}
                          city={event.city}
                          timeTbd={event.startTimeTbd}
                        />
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      {event.startTimeTbd ? null : (
                        <Countdown
                          startsAt={event.startsAt.toISOString()}
                          className="font-display text-ink hidden text-sm font-bold sm:block"
                        />
                      )}
                      {/* The whole point of the page. Three honest states: a
                          channel we can link, an announced no-stream, or
                          simply not announced yet. */}
                      {event.broadcastUrl ? (
                        <Button asChild size="sm">
                          <a
                            href={event.broadcastUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Tv />
                            {event.broadcastName?.trim() || "Where to watch"}
                          </a>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/events/${event.slug}`}>
                            Broadcast TBA
                            <ChevronRight />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<MonitorPlay />}
              title="Nothing scheduled"
              description="When the next event is announced it appears here with its broadcaster."
            />
          )}
        </CardBodyFlush>
      </Card>

      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-title text-ink uppercase">Footage</h2>
        <Link
          href="/news"
          className="text-volt shrink-0 text-xs font-medium underline underline-offset-4"
        >
          All coverage
        </Link>
      </div>

      {videoPosts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videoPosts.map(({ post, eventSlug, eventName }) => (
            <PostCard
              key={post.id}
              post={post}
              eventSlug={eventSlug}
              eventName={eventName}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<MonitorPlay />}
            title="No footage yet"
            description="Clips from each event land here as they are published."
          />
        </Card>
      )}
    </PageShell>
  );
}
