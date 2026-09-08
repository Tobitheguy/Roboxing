import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Tv } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { CompetitionFilter } from "@/components/competition-filter";
import { Countdown } from "@/components/countdown";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { safeTimeZone } from "@/lib/timezones";
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
          {/* Grouped by month, in the VENUE's calendar. A month-grid calendar
              was considered and rejected: at roughly one event a month it
              renders thirty empty cells per hit, and an empty grid reads as a
              dead sport. A dated list with month waypoints is what Eventim and
              Ticketmaster actually show for exactly this density of calendar —
              the grid only earns its place when most weeks have something in
              them. */}
          {events.map(({ event, competitionName, boutCount }, index) => {
            const monthOf = (e: (typeof events)[number]) =>
              new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
                timeZone: safeTimeZone(e.event.timezone),
              }).format(e.event.startsAt);
            const monthLabel = monthOf(events[index]);
            const isNewMonth =
              index === 0 || monthOf(events[index - 1]) !== monthLabel;
            const eventBouts = boutsByEvent.get(event.id) ?? [];
            return (
              <div key={event.id}>
                {isNewMonth ? (
                  <h2 className="font-display text-ink-muted mt-2 mb-3 text-sm font-semibold tracking-widest uppercase">
                    {monthLabel}
                  </h2>
                ) : null}
              <Card>
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
                          href={`/events/${event.slug}`}
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
                          timeTbd={event.startTimeTbd}
                        />
                      </p>
                      {event.venue ? (
                        <p className="text-ink-dim mt-1 text-xs">
                          {[event.venue, event.city, event.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      ) : null}
                      {/* Who is showing it, on the row itself. The calendar's
                          job is to answer "what is on and where do I watch
                          it", and for most of these the answer is somebody
                          else's channel — making the reader open the event
                          page to find that out is a step for nothing. */}
                      {event.broadcastUrl ? (
                        <p className="text-ink-dim mt-1 text-xs">
                          <Tv className="mr-1 inline size-3 align-[-1px]" />
                          {event.broadcastName?.trim() || "Streamed externally"}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      {/* No countdown to a time nobody announced. */}
                      {event.startTimeTbd ? (
                        <p className="font-display text-ink-muted text-lg font-bold">
                          TBA
                        </p>
                      ) : (
                        <Countdown
                          startsAt={event.startsAt.toISOString()}
                          className="font-display text-volt text-lg font-bold"
                        />
                      )}
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
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
