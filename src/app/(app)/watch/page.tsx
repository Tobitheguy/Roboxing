import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MonitorPlay, Tv } from "lucide-react";

import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { ChannelPill } from "@/components/channel-pill";
import { LiveStreamPlayer } from "@/components/live-stream-player";
import { EventDate } from "@/components/event-date";
import { Countdown } from "@/components/countdown";
import { EmptyState } from "@/components/empty-state";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { youtubeThumbnailUrl } from "@/lib/embeds";
import { getLiveNow } from "@/lib/live";
import {
  getAllWatchChannels,
  getPublishedPosts,
  getUpcomingEvents,
} from "@/lib/queries";
import { getLiveChannels } from "@/lib/twitch";

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
  const [live, upcoming, posts, channels, liveChannels] = await Promise.all([
    getLiveNow(),
    getUpcomingEvents(),
    getPublishedPosts(),
    getAllWatchChannels(),
    getLiveChannels(),
  ]);

  const videoPosts = posts.filter((p) => youtubeThumbnailUrl(p.post.embedUrl));

  /*
   * Dated events only.
   *
   * The schedule carries twelve upcoming rows and half of them are announced
   * with no date and no city — six unnamed CyberHero circuit stops among them.
   * Those belong on a calendar, where tracking an unfulfilled announcement is
   * the point. They do not belong here: you cannot watch an event nobody has
   * scheduled, and listing them pushes the answerable rows off the screen.
   */
  const watchable = upcoming.filter((e) => !e.event.dateTbd);

  /*
   * Channels grouped by league.
   *
   * This is the half of the page that was missing. "Broadcast TBA" on every row
   * was technically true per EVENT and useless as an answer, because for most
   * of these leagues the broadcaster does not vary by night: CMG's events are on
   * CCTV-10, CCTV Sports and CGTN whether or not anyone has announced a
   * particular card yet.
   *
   * Every league here is humanoid; the class sort is kept only as a guard, so
   * that a non-humanoid row added by hand would sort last rather than lead the
   * page.
   */
  const byLeague = new Map<string, typeof channels>();
  for (const row of channels) {
    const list = byLeague.get(row.competitionSlug) ?? [];
    list.push(row);
    byLeague.set(row.competitionSlug, list);
  }
  const CLASS_RANK = { humanoid: 0, piloted_mech: 1, adjacent: 2 } as const;
  const leagueGroups = [...byLeague.values()].sort(
    (a, b) =>
      CLASS_RANK[a[0].competitionClass] - CLASS_RANK[b[0].competitionClass] ||
      a[0].competitionName.localeCompare(b[0].competitionName),
  );

  return (
    <PageShell>
      <PageHeading
        eyebrow="Broadcast"
        title="Where to watch"
        description="This sport is broadcast by other people. Here is every channel that carries it, which event is next and who is showing it, and the footage from the nights already fought."
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

      {/*
        A league's own stream, playing here.

        This is the page's best possible state and it is rare -- roughly one
        event a month -- so it appears only when something is actually live and
        vanishes the rest of the time. An empty player is exactly the mistake
        this page made in its first version, promising "live events play here"
        on a site that holds no rights.
      */}
      {liveChannels.length > 0 ? (
        <div className="mb-10">
          <h2 className="font-display text-title text-ink mb-4 uppercase">
            Live now
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {liveChannels.map((channel) => (
              <LiveStreamPlayer key={channel.login} channel={channel} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ---- The standing answer, per league ----------------------------- */}
      {leagueGroups.length > 0 ? (
        <div className="mb-12">
          <h2 className="font-display text-title text-ink mb-2 uppercase">
            Channels by league
          </h2>
          <p className="text-ink-muted mb-5 max-w-2xl text-sm leading-relaxed">
            Every link here goes to a stream or to the organiser&rsquo;s own
            video channel — where the footage actually is. Not to a
            broadcaster&rsquo;s homepage, which answers a different question.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagueGroups.map((group) => (
              <Card key={group[0].competitionSlug}>
                <CardBody>
                  <Link
                    href={`/competitions/${group[0].competitionSlug}`}
                    className="font-display text-ink hover:text-volt text-sm font-semibold uppercase transition-colors"
                  >
                    {group[0].competitionName}
                  </Link>
                  {/* Icons, not rows. The notes live on the league page where
                      there is room; here the reader is hunting for a glyph. */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.map(({ channel }) => (
                      <ChannelPill
                        key={channel.id}
                        name={channel.name}
                        url={channel.url}
                      />
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <h2 className="font-display text-title text-ink mb-2 uppercase">
        Next up
      </h2>
      <p className="text-ink-muted mb-5 max-w-2xl text-sm leading-relaxed">
        Scheduled events only. Announced fixtures with no date yet are on the{" "}
        <Link
          href="/schedule"
          className="hover:text-ink underline underline-offset-2"
        >
          schedule
        </Link>{" "}
        — you cannot watch what nobody has scheduled.
      </p>

      <Card className="mb-10">
        <CardHeader title="Upcoming" />
        <CardBodyFlush>
          {watchable.length > 0 ? (
            <ul>
              {watchable.map(({ event, competitionName }) => (
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
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      {event.startTimeTbd || event.dateTbd || event.endsAt ? null : (
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
