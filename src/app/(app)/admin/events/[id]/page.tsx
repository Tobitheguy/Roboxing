import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ExternalLink, Radio, Swords } from "lucide-react";

import { BoutForm, EventForm } from "@/components/admin/entity-forms";
import { Badge, MethodBadge } from "@/components/badge";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { competitions, events, robots, teams } from "@/db/schema";
import { toDateTimeLocal } from "@/lib/format";
import { getBoutsForEvent } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Fight card",
  robots: { index: false, follow: false },
};

export default async function AdminEventPage(
  props: PageProps<"/admin/events/[id]">,
) {
  const { id } = await props.params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) notFound();

  const [bouts, competitionOptions, robotOptions] = await Promise.all([
    getBoutsForEvent(event.id),
    db
      .select({ id: competitions.id, name: competitions.name })
      .from(competitions)
      .orderBy(competitions.name),
    db
      .select({ id: robots.id, name: robots.name, teamName: teams.name })
      .from(robots)
      .innerJoin(teams, eq(robots.teamId, teams.id))
      .orderBy(asc(robots.name)),
  ]);

  const nextOrderIndex =
    bouts.reduce((max, b) => Math.max(max, b.orderIndex), 0) + 1;

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title={event.name}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/events/${event.slug}`} target="_blank">
                <ExternalLink />
                Viewer page
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/events/${event.id}/live`}>
                <Radio />
                Console
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader
          title="Fight card"
          action={
            <span className="text-ink-dim tabular text-xs">
              {bouts.length} {bouts.length === 1 ? "bout" : "bouts"}
            </span>
          }
        />
        <CardBodyFlush>
          {bouts.length === 0 ? (
            <EmptyState
              icon={<Swords />}
              title="No bouts yet"
              description="Add the first bout below. Order 1 opens the night; the highest number is the main event."
            />
          ) : (
            <ul>
              {bouts.map((bout) => (
                <li
                  key={bout.id}
                  className="border-line/60 border-b last:border-b-0"
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
                    <span className="font-display tabular text-ink-dim w-6 text-sm font-bold">
                      {bout.orderIndex}
                    </span>
                    <span className="font-display text-ink min-w-0 flex-1 truncate text-sm font-semibold uppercase">
                      {bout.robotA.name}
                      <span className="text-ink-dim px-2 text-xs normal-case">
                        vs
                      </span>
                      {bout.robotB.name}
                    </span>
                    <Badge variant="outline">
                      {bout.scheduledRounds} rounds
                    </Badge>
                    {bout.result ? (
                      <MethodBadge method={bout.result.method} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBodyFlush>

        {robotOptions.length >= 2 ? (
          <CardBody className="border-line border-t">
            <p className="eyebrow mb-4">Add a bout</p>
            <BoutForm
              eventId={event.id}
              nextOrderIndex={nextOrderIndex}
              robots={robotOptions}
            />
          </CardBody>
        ) : (
          <CardBody className="border-line border-t">
            <p className="text-ink-muted text-sm">
              At least two robots must exist before a bout can be booked.{" "}
              <Link href="/admin/robots" className="text-volt underline">
                Add robots
              </Link>
              .
            </p>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader title="Event details" />
        <CardBody>
          <EventForm
            event={event}
            competitions={competitionOptions}
            startsAtLocal={toDateTimeLocal(event.startsAt, event.timezone)}
          />
        </CardBody>
      </Card>
    </PageShell>
  );
}
