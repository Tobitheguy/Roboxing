import Link from "next/link";
import { CalendarClock, ListOrdered, Trophy } from "lucide-react";

import { AddToCalendar } from "@/components/add-to-calendar";
import { BoutList } from "@/components/bout-row";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { Countdown } from "@/components/countdown";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { StandingsSnapshot } from "@/components/standings-table";
import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/lib/app-url";
import { formatRecord, rankRobotsByRecord } from "@/lib/records";
import { getLiveNow } from "@/lib/live";
import {
  getAllResults,
  getLatestResults,
  getNextEvent,
  getPrimaryCompetition,
} from "@/lib/queries";
import { getStandings } from "@/lib/standings";

/**
 * The signed-in home: what is happening now, what happened last, where the
 * season stands.
 *
 * Lives in components/ rather than as the `/` page because `/` now has two
 * faces — this one for members, and the landing page for everyone else. The
 * route decides which; this file only knows how to be the member view.
 */
export async function HomeDashboard() {
  // getLatestResults does not depend on the competition, so it belongs in the
  // first batch — Neon's HTTP driver pays a full round trip per query with no
  // server-side batching, so an avoidable second phase is an avoidable delay.
  const [live, primary, next, latest] = await Promise.all([
    getLiveNow(),
    getPrimaryCompetition(),
    getNextEvent(),
    getLatestResults(5),
  ]);

  const [standings, seasonResults] = await Promise.all([
    primary ? getStandings(primary.id) : Promise.resolve([]),
    primary ? getAllResults(primary.slug) : Promise.resolve([]),
  ]);

  const form = rankRobotsByRecord(seasonResults, 4);
  const appUrl = getAppUrl();

  return (
    <PageShell>
      {/* ---------------------------------------------------------------- */}
      {/* Hero: whatever is happening soonest, in priority order.           */}
      <section className="border-line bg-surface overflow-hidden rounded-lg border">
        {live ? (
          <div className="px-6 py-12 sm:px-10 sm:py-16">
            <LivePill status="live" className="mb-6" />
            <h1 className="text-display font-display text-ink max-w-3xl uppercase">
              {live.eventName}
            </h1>
            <p className="text-ink-muted mt-4 text-base">
              Broadcasting now.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href={`/watch/${live.eventSlug}`}>Watch live</Link>
              </Button>
            </div>
          </div>
        ) : next ? (
          <div className="px-6 py-12 sm:px-10 sm:py-16">
            <p className="eyebrow mb-4">
              Next event · {next.competitionName}
            </p>
            <h1 className="text-display font-display text-ink max-w-3xl uppercase">
              {next.event.name}
            </h1>

            <Countdown
              startsAt={next.event.startsAt.toISOString()}
              className="font-display text-volt mt-6 block text-3xl font-bold sm:text-5xl"
            />

            <p className="text-ink-muted mt-4 text-sm">
              <EventTime
                startsAt={next.event.startsAt.toISOString()}
                timeZone={next.event.timezone}
                city={next.event.city}
              />
              {next.event.venue ? (
                <span className="text-ink-dim"> · {next.event.venue}</span>
              ) : null}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <AddToCalendar
                eventSlug={next.event.slug}
                eventName={next.event.name}
                competitionName={next.competitionName}
                startsAt={next.event.startsAt}
                location={[next.event.venue, next.event.city]
                  .filter(Boolean)
                  .join(", ")}
                appUrl={appUrl}
              />
              <Button asChild variant="ghost" size="lg">
                <Link href={`/watch/${next.event.slug}`}>Fight card</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-16 text-center sm:py-20">
            {/* An h1 even in the empty state — this is a reachable state
                (pre-launch, off-season, after the last event) and a page with
                no heading at all is a real accessibility defect, not a
                cosmetic one. */}
            <h1 className="font-display text-hero text-ink uppercase">
              Live robot combat
            </h1>
            <EmptyState
              icon={<CalendarClock />}
              title="No events scheduled"
              description="When the next event is announced, it appears here with a countdown."
              className="pt-6 pb-0"
            />
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Latest results"
            action={
              latest.length > 0 ? (
                <Link
                  href="/results"
                  className="text-volt text-xs font-medium underline underline-offset-4"
                >
                  All results
                </Link>
              ) : null
            }
          />
          <CardBodyFlush>
            {latest.length > 0 ? (
              <BoutList bouts={latest} showEvent />
            ) : (
              <EmptyState
                icon={<Trophy />}
                title="No results recorded"
                description="Every completed bout will show here with its winner, method, and round."
              />
            )}
          </CardBodyFlush>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={primary ? `${primary.name} — standings` : "Standings"}
            />
            <CardBodyFlush>
              {standings.length > 0 && primary ? (
                <StandingsSnapshot
                  rows={standings}
                  competitionSlug={primary.slug}
                />
              ) : (
                <EmptyState
                  icon={<ListOrdered />}
                  title="No standings yet"
                  description="Standings are computed from results, so the table appears with the first recorded bout."
                />
              )}
            </CardBodyFlush>
          </Card>

          {form.length > 0 ? (
            <Card>
              <CardHeader title="Form" />
              <CardBody className="space-y-3">
                {form.map(({ robot, record }) => (
                  <Link
                    key={robot.id as number}
                    href={`/robots/${robot.slug as string}`}
                    className="hover:bg-surface-2 -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors"
                  >
                    <RobotAvatar
                      name={robot.name as string}
                      photoUrl={robot.photoUrl as string | null}
                      size="sm"
                      decorative
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-ink truncate text-sm font-semibold uppercase">
                        {robot.name as string}
                      </p>
                      <p className="text-ink-dim truncate text-xs">
                        {robot.teamName as string}
                      </p>
                    </div>
                    <span className="font-display tabular text-ink-muted text-sm font-semibold">
                      {formatRecord(record)}
                    </span>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
