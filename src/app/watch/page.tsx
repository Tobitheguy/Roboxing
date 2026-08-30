import type { Metadata } from "next";
import Link from "next/link";
import { MonitorPlay } from "lucide-react";

import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { Countdown } from "@/components/countdown";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getLiveNow } from "@/lib/live";
import { getAllResults, getUpcomingEvents } from "@/lib/queries";

export const metadata: Metadata = { title: "Watch" };

export default async function WatchIndexPage() {
  const [live, upcoming] = await Promise.all([
    getLiveNow(),
    getUpcomingEvents(),
  ]);

  // Events that already happened, newest first — the recordings.
  const results = await getAllResults();
  const pastEvents = [...new Map(results.map((b) => [b.event.id, b.event])).values()];

  return (
    <PageShell>
      <PageHeading
        eyebrow="Broadcast"
        title="Watch"
        description="Live events play here, and the recording stays at the same address afterward."
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
              <Link href={`/watch/${live.eventSlug}`}>Watch live</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader title="Upcoming" />
        <CardBodyFlush>
          {upcoming.length > 0 ? (
            <ul>
              {upcoming.map(({ event, competitionName }) => (
                <li
                  key={event.id}
                  className="border-line/60 border-b last:border-b-0"
                >
                  <Link
                    href={`/watch/${event.slug}`}
                    className="hover:bg-surface-2 flex flex-wrap items-center justify-between gap-4 px-4 py-4 transition-colors sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-ink truncate text-sm font-semibold uppercase">
                        {event.name}
                      </p>
                      <p className="text-ink-dim mt-1 text-xs">
                        {competitionName}
                        <span className="text-ink-dim"> · </span>
                        <EventTime
                          startsAt={event.startsAt.toISOString()}
                          timeZone={event.timezone}
                          city={event.city}
                        />
                      </p>
                    </div>
                    <Countdown
                      startsAt={event.startsAt.toISOString()}
                      className="font-display text-volt shrink-0 text-sm font-bold"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<MonitorPlay />}
              title="Nothing scheduled"
              description="When the next event is announced it appears here."
            />
          )}
        </CardBodyFlush>
      </Card>

      {pastEvents.length > 0 ? (
        <Card>
          <CardHeader title="Past events" />
          <CardBodyFlush>
            <ul>
              {pastEvents.map((event) => (
                <li
                  key={event.id}
                  className="border-line/60 border-b last:border-b-0"
                >
                  <Link
                    href={`/watch/${event.slug}`}
                    className="hover:bg-surface-2 flex items-center justify-between gap-4 px-4 py-4 transition-colors sm:px-6"
                  >
                    <span className="font-display text-ink truncate text-sm font-semibold uppercase">
                      {event.name}
                    </span>
                    <span className="text-ink-dim shrink-0 text-xs">
                      <EventTime
                        startsAt={event.startsAt.toISOString()}
                        timeZone={event.timezone}
                        city={event.city}
                        showDate
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBodyFlush>
        </Card>
      ) : null}
    </PageShell>
  );
}
