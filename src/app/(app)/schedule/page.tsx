import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Tv } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { CompetitionFilter } from "@/components/competition-filter";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Countdown } from "@/components/countdown";
import { EmptyState } from "@/components/empty-state";
import { EventDate } from "@/components/event-date";
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

  /*
   * Two lists, and the split is the point of this page.
   *
   * `dated` is a calendar: things with a day on them, in order, which is what a
   * schedule normally is. `announced` is everything a promoter has committed to
   * without saying when or where — six CyberHero circuit cities, a URKL grand
   * final that is "December or January" in Dubai, a CMG final with no published
   * date at all.
   *
   * Mixing them would be the easy thing and the wrong one. Sorted into the
   * calendar by their placeholder instants, those rows read as fixtures; left
   * out entirely, the schedule under-reports what is actually coming. They are
   * their own section because "announced, unscheduled" is a real status in this
   * sport and nobody else is publishing it.
   */
  const dated = events.filter((e) => !e.event.dateTbd);
  const announced = events.filter((e) => e.event.dateTbd);

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

      {dated.length === 0 && announced.length === 0 ? (
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
      ) : dated.length === 0 ? null : (
        <div className="space-y-6">
          {/* Grouped by month, in the VENUE's calendar. A month-grid calendar
              was considered and rejected: at roughly one event a month it
              renders thirty empty cells per hit, and an empty grid reads as a
              dead sport. A dated list with month waypoints is what Eventim and
              Ticketmaster actually show for exactly this density of calendar —
              the grid only earns its place when most weeks have something in
              them. */}
          {dated.map(({ event, competitionName, boutCount }, index) => {
            const monthOf = (e: (typeof dated)[number]) =>
              new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
                timeZone: safeTimeZone(e.event.timezone),
              }).format(e.event.startsAt);
            const monthLabel = monthOf(dated[index]);
            const isNewMonth =
              index === 0 || monthOf(dated[index - 1]) !== monthLabel;
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
                    <span className="flex items-center gap-2">
                      {event.status === "live" ? <LivePill status="live" /> : null}
                      <ConfidenceBadge level={event.confidence} />
                    </span>
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
                      {/* The caveat beside the date, which on this schedule is
                          frequently worth more than the date. */}
                      {event.note ? (
                        <p className="text-ink-dim mt-2 max-w-xl text-xs leading-relaxed">
                          {event.note}
                        </p>
                      ) : null}
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
                      {event.startTimeTbd || event.endsAt ? (
                        <p className="font-display text-ink-muted text-lg font-bold">
                          {event.endsAt ? "Season" : "TBA"}
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

      {/* Announced, unscheduled. The section no other site publishes.
          A promoter saying "eight cities across four regions" and naming one of
          them is a commitment, and tracking the seven that have not arrived is
          the difference between a calendar and a record. */}
      {announced.length > 0 ? (
        <div className="mt-12">
          <h2 className="font-display text-title text-ink uppercase">
            Announced, not yet scheduled
          </h2>
          <p className="text-ink-muted mt-2 max-w-2xl text-sm leading-relaxed">
            Events a promoter has committed to without publishing a date, a city
            or both. They are listed apart from the calendar above because
            nothing here is a fixture yet — and listed at all because an
            announcement with nothing behind it is still the best available
            answer to what is coming next.
          </p>

          <Card className="mt-5">
            <CardBodyFlush>
              <ul>
                {announced.map(({ event, competitionName }) => (
                  <li
                    key={event.id}
                    className="border-line/60 border-b px-4 py-4 last:border-b-0 sm:px-6"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-ink-dim text-xs tracking-widest uppercase">
                          {competitionName}
                        </p>
                        <h3 className="font-display text-ink mt-1 text-sm font-semibold uppercase">
                          <Link
                            href={`/events/${event.slug}`}
                            className="hover:text-volt transition-colors"
                          >
                            {event.name}
                          </Link>
                        </h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-display text-ink-muted text-sm font-bold">
                          {event.dateLabel?.trim() || "Date TBA"}
                        </span>
                        <ConfidenceBadge level={event.confidence} />
                      </div>
                    </div>
                    {event.note ? (
                      <p className="text-ink-dim mt-2 max-w-2xl text-xs leading-relaxed">
                        {event.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardBodyFlush>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
