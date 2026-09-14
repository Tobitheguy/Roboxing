import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Card, CardBodyFlush } from "@/components/card";
import { CompetitionFilter } from "@/components/competition-filter";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { EmptyState } from "@/components/empty-state";
import { EventRow } from "@/components/event-row";
import { dateZone } from "@/components/event-date";
import { PageHeading, PageShell } from "@/components/page-shell";
import { safeTimeZone } from "@/lib/timezones";
import {
  getLeagues,
  getUpcomingBouts,
  getUpcomingEvents,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage(props: PageProps<"/schedule">) {
  const params = await props.searchParams;
  const raw = params.competition;
  const competition = Array.isArray(raw) ? raw[0] : raw;

  const [competitions, events, bouts] = await Promise.all([
    // getLeagues, not getCompetitions: the filter is a list of LEAGUES, and
    // `getCompetitions` also returns the exhibitions container — a row that
    // exists so a manufacturer's sparring video has somewhere to hang without
    // inventing a competition for it. Listing it as a filter chip presented it
    // as a league, which it is not.
    getLeagues(),
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

      {/*
       * THE BOUT LIST USED TO BE IN HERE, AND THAT IS WHAT MADE THIS PAGE
       * HEAVY.
       *
       * Every schedule entry printed its full card inline, which on a
       * schedule means printing "Card not announced" down the length of the
       * page — most fixtures in this sport are announced as a number of bouts
       * with no pairings. The row now carries the event's identity and links
       * to the card; the card lives on the event page, where there is room
       * for it and where a reader who wants it has asked for it.
       *
       * That is the actual lesson from UFC's events list, which Tobias sent
       * me to look at: the row is lean because it is not trying to be the
       * event page too.
       */}
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
          {dated.map(
            (
              {
                event,
                competitionName,
                competitionSlug,
                competitionLogoUrl,
                boutCount,
              },
              index,
            ) => {
            // Grouped in the venue's calendar — except for date-only rows,
            // where there is no announced time to convert and the venue's zone
            // would file a 1 October season under September. See dateZone().
            const monthOf = (e: (typeof dated)[number]) =>
              new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
                timeZone: safeTimeZone(
                  dateZone(e.event.timezone, e.event.startTimeTbd),
                ),
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
              <EventRow
                  event={event}
                  competitionName={competitionName}
                  competitionSlug={competitionSlug}
                  competitionLogoUrl={competitionLogoUrl}
                  boutCount={boutCount}
                  bouts={eventBouts}
                />
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
