import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { CalendarClock, Radio, Settings2 } from "lucide-react";

import { EventForm } from "@/components/admin/entity-forms";
import { Badge } from "@/components/badge";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { bouts, competitions, events } from "@/db/schema";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEventsPage() {
  const viewer = await getViewer();

  const [rows, competitionOptions] = await Promise.all([
    db
      .select({
        event: events,
        competitionName: competitions.name,
        boutCount: sql<number>`(select count(*) from ${bouts} where ${bouts.eventId} = ${events.id})::int`,
        resultCount: sql<number>`(select count(*) from ${bouts} inner join bout_results on bout_results.bout_id = ${bouts.id} where ${bouts.eventId} = ${events.id})::int`,
      })
      .from(events)
      .innerJoin(competitions, eq(events.competitionId, competitions.id))
      .orderBy(desc(events.startsAt)),
    db
      .select({ id: competitions.id, name: competitions.name })
      .from(competitions)
      .orderBy(competitions.name),
  ]);

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Events"
        description={viewer ? `Signed in as ${viewer.email}.` : undefined}
      />

      {competitionOptions.length === 0 ? (
        <Card className="mb-6">
          <EmptyState
            title="Create a competition first"
            description="Every event belongs to a competition, so there is nothing to attach one to yet."
            action={
              <Button asChild>
                <Link href="/admin/competitions">Competitions</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader title="Add an event" />
          <CardBody>
            <EventForm competitions={competitionOptions} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="All events" />
        <CardBodyFlush>
          {rows.length === 0 ? (
            <EmptyState
              icon={<CalendarClock />}
              title="No events yet"
              description="Create one above, then build its fight card."
            />
          ) : (
            <ul>
              {rows.map(({ event, competitionName, boutCount, resultCount }) => (
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
                        <span className="text-ink-dim"> · </span>
                        <span className="tabular">
                          {resultCount}/{boutCount} recorded
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {event.access === "subscription" ? (
                        <Badge variant="volt">subscribers</Badge>
                      ) : null}
                      {event.status === "live" ? (
                        <LivePill status="live" />
                      ) : (
                        <Badge variant="outline">{event.status}</Badge>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/events/${event.id}`}>
                          <Settings2 />
                          Card
                        </Link>
                      </Button>
                      <Button asChild size="sm">
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
    </PageShell>
  );
}
