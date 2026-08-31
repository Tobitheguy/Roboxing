import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ListOrdered } from "lucide-react";

import { Badge } from "@/components/badge";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { StandingsTable } from "@/components/standings-table";
import { StatRow, StatTile } from "@/components/stat-tile";
import {
  getCompetitionBySlug,
  getEventsForCompetition,
} from "@/lib/queries";
import { getStandings } from "@/lib/standings";

export async function generateMetadata(
  props: PageProps<"/competitions/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const competition = await getCompetitionBySlug(slug);
  return { title: competition?.name ?? "Competition" };
}

export default async function CompetitionPage(
  props: PageProps<"/competitions/[slug]">,
) {
  const { slug } = await props.params;
  const competition = await getCompetitionBySlug(slug);
  if (!competition) notFound();

  const [standings, events] = await Promise.all([
    getStandings(competition.id),
    getEventsForCompetition(competition.id),
  ]);

  const upcoming = events.filter(
    (e) => e.event.status === "scheduled" || e.event.status === "live",
  );
  const completed = events
    .filter((e) => e.event.status === "completed")
    .reverse();

  const boutsFought = standings.reduce((sum, r) => sum + r.played, 0) / 2;
  const knockouts = standings.reduce((sum, r) => sum + r.ko, 0);

  return (
    <PageShell>
      <PageHeading
        eyebrow={
          competition.organizer
            ? `${competition.organizer}${competition.seasonYear ? ` · ${competition.seasonYear}` : ""}`
            : competition.seasonYear
              ? `Season ${competition.seasonYear}`
              : undefined
        }
        title={competition.name}
        description={competition.description ?? undefined}
        action={
          <Badge variant={competition.status === "active" ? "volt" : "outline"}>
            {competition.status}
          </Badge>
        }
      />

      <StatRow className="mb-8">
        <StatTile label="Teams" value={standings.length} />
        <StatTile label="Events" value={events.length} />
        <StatTile label="Bouts fought" value={boutsFought} />
        <StatTile label="Knockouts" value={knockouts} emphasis />
      </StatRow>

      <Card>
        <CardHeader title="Standings" />
        <CardBodyFlush>
          {standings.length > 0 ? (
            <StandingsTable rows={standings} />
          ) : (
            <EmptyState
              icon={<ListOrdered />}
              title="No standings yet"
              description="The table is computed from recorded results and appears with the first one."
            />
          )}
        </CardBodyFlush>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Upcoming" />
          <CardBodyFlush>
            {upcoming.length > 0 ? (
              <EventList events={upcoming} />
            ) : (
              <EmptyState
                icon={<CalendarClock />}
                title="Nothing scheduled"
                description="No further events are on the calendar for this season."
              />
            )}
          </CardBodyFlush>
        </Card>

        <Card>
          <CardHeader title="Completed" />
          <CardBodyFlush>
            {completed.length > 0 ? (
              <EventList events={completed} />
            ) : (
              <EmptyState
                icon={<CalendarClock />}
                title="No events yet"
                description="Completed events and their full cards will appear here."
              />
            )}
          </CardBodyFlush>
        </Card>
      </div>
    </PageShell>
  );
}

type EventRow = Awaited<ReturnType<typeof getEventsForCompetition>>[number];

function EventList({ events }: { events: EventRow[] }) {
  return (
    <ul>
      {events.map(({ event, boutCount }) => (
        <li key={event.id} className="border-line/60 border-b last:border-b-0">
          <Link
            href={`/watch/${event.slug}`}
            className="hover:bg-surface-2 flex items-center justify-between gap-4 px-4 py-4 transition-colors sm:px-6"
          >
            <div className="min-w-0">
              <p className="font-display text-ink truncate text-sm font-semibold uppercase">
                {event.name}
              </p>
              <p className="text-ink-dim mt-1 text-xs">
                <EventTime
                  startsAt={event.startsAt.toISOString()}
                  timeZone={event.timezone}
                  city={event.city}
                />
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {event.status === "live" ? <LivePill status="live" /> : null}
              <span className="text-ink-dim tabular text-xs">
                {boutCount} {boutCount === 1 ? "bout" : "bouts"}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
