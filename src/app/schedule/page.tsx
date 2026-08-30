import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { CompetitionFilter } from "@/components/competition-filter";
import { Countdown } from "@/components/countdown";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import {
  getCompetitions,
  getUpcomingBouts,
  getUpcomingEvents,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage(props: PageProps<"/schedule">) {
  const params = await props.searchParams;
  const raw = params.competition;
  const competition = Array.isArray(raw) ? raw[0] : raw;

  const [competitions, events, bouts] = await Promise.all([
    getCompetitions(),
    getUpcomingEvents(competition),
    getUpcomingBouts(competition),
  ]);

  // Group once rather than filtering the whole bout list per event, which is
  // O(events x bouts). /results already does it this way; there was no reason
  // for the two pages to differ.
  const boutsByEvent = new Map<number, typeof bouts>();
  for (const bout of bouts) {
    const list = boutsByEvent.get(bout.event.id) ?? [];
    list.push(bout);
    boutsByEvent.set(bout.event.id, list);
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Upcoming"
        title="Schedule"
        description="Every scheduled event, in your timezone and the venue's."
      />

      <CompetitionFilter
        competitions={competitions}
        active={competition}
        basePath="/schedule"
      />

      {events.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock />}
            title="Nothing scheduled"
            description={
              competition
                ? "This competition has no upcoming events."
                : "No events are on the calendar yet."
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {events.map(({ event, competitionName, boutCount }) => {
            const eventBouts = boutsByEvent.get(event.id) ?? [];
            return (
              <Card key={event.id}>
                <CardHeader
                  title={competitionName}
                  action={
                    event.status === "live" ? <LivePill status="live" /> : null
                  }
                />
                <div className="border-line/60 border-b px-4 py-5 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-display text-title text-ink uppercase">
                        <Link
                          href={`/watch/${event.slug}`}
                          className="hover:text-volt transition-colors"
                        >
                          {event.name}
                        </Link>
                      </h2>
                      <p className="text-ink-muted mt-2 text-sm">
                        <EventTime
                          startsAt={event.startsAt.toISOString()}
                          timeZone={event.timezone}
                          city={event.city}
                        />
                      </p>
                      {event.venue ? (
                        <p className="text-ink-dim mt-1 text-xs">
                          {[event.venue, event.city, event.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <Countdown
                        startsAt={event.startsAt.toISOString()}
                        className="font-display text-volt text-lg font-bold"
                      />
                      <p className="text-ink-dim tabular mt-1 text-xs">
                        {boutCount} {boutCount === 1 ? "bout" : "bouts"}
                      </p>
                    </div>
                  </div>
                </div>
                <CardBodyFlush>
                  {eventBouts.length > 0 ? (
                    <BoutList bouts={eventBouts} />
                  ) : (
                    <EmptyState
                      title="Card not announced"
                      description="Bouts appear here once the organizer confirms the card."
                    />
                  )}
                </CardBodyFlush>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
