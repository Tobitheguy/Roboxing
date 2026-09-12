import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ListOrdered } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { Badge } from "@/components/badge";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { StandingsTable } from "@/components/standings-table";
import { StatRow, StatTile } from "@/components/stat-tile";
import { LeagueMarkBadge } from "@/components/league-mark";
import { toParagraphs } from "@/lib/embeds";
import { formatDateLong } from "@/lib/format";
import {
  getCompetitionBySlug,
  getEventsForCompetition,
  getLastResultRecordedAt,
  getPostsForCompetition,
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

  const [standings, events, lastRecordedAt, coverage] = await Promise.all([
    getStandings(competition.id),
    getEventsForCompetition(competition.id),
    getLastResultRecordedAt(competition.id),
    getPostsForCompetition(competition.id),
  ]);

  /*
   * Results we know about but cannot put in the table.
   *
   * Newest first, because the one a visitor came for is the last one that
   * happened. See `events.results_summary` for why these exist at all: a bout
   * needs two named robots, and a league that reports "yellow corner beat blue
   * corner 4-3" gives us a fact the standings cannot hold.
   */
  const reported = events
    .filter(({ event }) => event.resultsSummary?.trim())
    .sort((a, b) => b.event.startsAt.getTime() - a.event.startsAt.getTime());

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
      <BackLink href="/competitions" label="All leagues" />
      <PageHeading
        eyebrow={
          competition.organizer
            ? `${competition.organizer}${competition.seasonYear ? ` · ${competition.seasonYear}` : ""}`
            : competition.seasonYear
              ? `Season ${competition.seasonYear}`
              : undefined
        }
        title={
          <span className="flex items-center gap-4">
            <LeagueMarkBadge
              slug={competition.slug}
              name={competition.name}
              logoUrl={competition.logoUrl}
              size="lg"
            />
            {competition.name}
          </span>
        }
        // Deliberately NOT the description. PageHeading renders whatever it is
        // given inside a single <p>, and a league description is now several
        // paragraphs — HTML would collapse the blank lines and serve one
        // unreadable block. The prose renders below instead.
        action={
          <Badge variant={competition.status === "active" ? "volt" : "outline"}>
            {competition.status}
          </Badge>
        }
      />

      {/* What this league actually is. On a site covering five of them, with
          nobody yet knowing any, this is the most valuable text on the page —
          more so than the table underneath it. Same plain-text-to-paragraphs
          renderer the posts use; there is no HTML path into it. */}
      {competition.description ? (
        <div className="mb-8 max-w-3xl space-y-4">
          {toParagraphs(competition.description).map((paragraph, i) => (
            <p key={i} className="text-ink-muted leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {/* Fight-count tiles only once fights are on record; until then the
          row is events-only rather than a parade of zeros. */}
      {boutsFought > 0 ? (
        <StatRow className="mb-8">
          <StatTile label="Teams" value={standings.length} />
          <StatTile label="Events" value={events.length} />
          <StatTile label="Bouts fought" value={boutsFought} />
          <StatTile label="Knockouts" value={knockouts} emphasis />
        </StatRow>
      ) : (
        <StatRow className="mb-8">
          <StatTile label="Events on record" value={events.length} emphasis />
          <StatTile
            label="Verified results"
            value={reported.length > 0 ? reported.length : "—"}
            sub={
              reported.length > 0
                ? "Reported, not yet a full card"
                : "No full cards published yet"
            }
          />
        </StatRow>
      )}

      {/* Before the standings, deliberately. When a league has a result we know
          and a table we cannot fill, the result is the more honest thing to lead
          with — a visitor who scrolls past "No standings yet" and leaves has
          been told we do not know, which is false. */}
      {reported.length > 0 ? (
        <Card className="mb-6">
          <CardHeader
            title="Reported results"
            action={
              <span className="text-ink-dim text-xs">
                Not in the table below
              </span>
            }
          />
          <CardBodyFlush>
            <ul>
              {reported.map(({ event }) => (
                <li
                  key={event.id}
                  className="border-line/60 border-b px-4 py-4 last:border-b-0 sm:px-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link
                      href={`/events/${event.slug}`}
                      className="font-display text-ink hover:text-volt text-sm font-semibold uppercase transition-colors"
                    >
                      {event.name}
                    </Link>
                    <span className="text-ink-dim tabular text-xs">
                      {formatDateLong(event.startsAt, event.timezone)}
                    </span>
                  </div>
                  {/* Several sentences, so the same plain-text renderer the
                      posts and the league description use. */}
                  <div className="mt-2 max-w-2xl space-y-2">
                    {toParagraphs(event.resultsSummary ?? "").map((p, i) => (
                      <p key={i} className="text-ink-muted text-sm leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </CardBodyFlush>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Standings"
          action={
            // HLTV's "Last updated" stamp. A table with no date on it claims
            // to be current forever; a dated one says what it actually is.
            lastRecordedAt ? (
              <span className="text-ink-dim tabular text-xs">
                Last result {formatDateLong(lastRecordedAt, "UTC")}
              </span>
            ) : null
          }
        />
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

      {/* The writing about this league, on the league. Found through its events,
          so a general piece about all five leagues correctly appears on none of
          them. */}
      {coverage.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-display text-title text-ink mb-4 uppercase">
            Coverage
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {coverage.map(({ post, eventSlug, eventName }) => (
              <PostCard
                key={post.id}
                post={post}
                eventSlug={eventSlug}
                eventName={eventName}
              />
            ))}
          </div>
        </div>
      ) : null}
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
            href={`/events/${event.slug}`}
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
                  timeTbd={event.startTimeTbd}
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
