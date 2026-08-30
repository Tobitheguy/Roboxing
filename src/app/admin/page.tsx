import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Radio } from "lucide-react";

import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { getCompetitions, getUpcomingEvents } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin home.
 *
 * Deliberately thin at this checkpoint: enough to prove a session can be
 * obtained and used, and to reach the run-of-show console. The CRUD screens
 * and the import tool are the next step's work.
 */
export default async function AdminPage() {
  const viewer = await getViewer();
  const [events, competitions] = await Promise.all([
    getUpcomingEvents(),
    getCompetitions(),
  ]);

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Run of show"
        description={viewer ? `Signed in as ${viewer.email}.` : undefined}
      />

      <Card>
        <CardHeader
          title="Events"
          action={
            <span className="text-ink-dim tabular text-xs">
              {competitions.length}{" "}
              {competitions.length === 1 ? "competition" : "competitions"}
            </span>
          }
        />
        <CardBodyFlush>
          {events.length === 0 ? (
            <EmptyState
              icon={<CalendarClock />}
              title="No upcoming events"
              description="Events created in the next step will appear here, ready to go live."
            />
          ) : (
            <ul>
              {events.map(({ event, competitionName }) => (
                <li
                  key={event.id}
                  className="border-line/60 border-b last:border-b-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
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
                    <div className="flex items-center gap-3">
                      {event.status === "live" ? (
                        <LivePill status="live" />
                      ) : null}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/events/${event.id}/live`}>
                          <Radio />
                          Console
                        </Link>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBodyFlush>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <p className="text-ink-muted text-sm">
            CRUD for competitions, teams, robots, events, and bouts, the CSV
            import, and the run-of-show console are built in the next step. This
            page exists so the session you just created is actually usable.
          </p>
        </CardBody>
      </Card>
    </PageShell>
  );
}
