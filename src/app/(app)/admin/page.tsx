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
import { bouts, competitions, events, watchChannels } from "@/db/schema";
import { getViewer } from "@/lib/auth";
import { checkClerk } from "@/lib/clerk-health";
import { checkTwitch } from "@/lib/twitch-health";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEventsPage() {
  const viewer = await getViewer();

  const [rows, competitionOptions, twitchChannelUrls] = await Promise.all([
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
    db.select({ url: watchChannels.url }).from(watchChannels),
  ]);

  /* Probed on every load of this page and never cached — see the note in
     `twitch-health`. It is one token request and one Helix call, on an
     admin-only page that nobody loads in a loop. */
  const twitch = await checkTwitch(twitchChannelUrls.map((r) => r.url));
  /* Synchronous — it reads one env var and compares a prefix. */
  const clerk = checkClerk();

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Events"
        description={viewer ? `Signed in as ${viewer.email}.` : undefined}
      />

      {/*
       * THE TWITCH CREDENTIAL, VISIBLE.
       *
       * `getLiveChannels()` swallows every failure by design, so a wrong
       * secret and a quiet Tuesday looked identical from the outside. This
       * says which of the three steps passed. Nothing here is the secret —
       * three booleans, a message, and the first eight characters of the
       * client id, which Twitch publishes in browser requests anyway.
       */}
      {/*
       * SIGN-IN, which is the one credential on this site that a VISITOR can
       * see the state of. Clerk prints "Development mode" under its own form,
       * so a wrong key here is not a quiet failure — it is a label on the
       * product. It sat there for days because nothing looked.
       */}
      <Card className="mb-6">
        <CardHeader
          title="Sign-in"
          action={
            <span
              className={cn(
                "font-mono px-2 py-1 text-[11px] font-bold tracking-[0.1em] uppercase",
                clerk.production
                  ? "chip-confirmed"
                  : clerk.configured
                    ? "chip-unconfirmed"
                    : "chip-reported",
              )}
            >
              {clerk.production
                ? "Production"
                : clerk.configured
                  ? "Development"
                  : "Not configured"}
            </span>
          }
        />
        {clerk.problem ? (
          <CardBody>
            <p className="text-ink-muted max-w-2xl text-sm leading-relaxed">
              {clerk.problem}
            </p>
          </CardBody>
        ) : null}
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Twitch"
          action={
            <span
              className={cn(
                "font-mono px-2 py-1 text-[11px] font-bold tracking-[0.1em] uppercase",
                twitch.queryable
                  ? "chip-confirmed"
                  : twitch.configured
                    ? "chip-unconfirmed"
                    : "chip-reported",
              )}
            >
              {twitch.queryable
                ? "Working"
                : twitch.configured
                  ? "Failing"
                  : "Not configured"}
            </span>
          }
        />
        <CardBody>
          <dl className="grid gap-3 sm:grid-cols-4">
            {[
              ["Variables set", twitch.configured],
              ["Authenticates", twitch.authenticates],
              ["Helix answers", twitch.queryable],
            ].map(([label, ok]) => (
              <div key={String(label)}>
                <dt className="eyebrow">{String(label)}</dt>
                <dd className="font-display text-ink mt-1 text-lg">
                  {ok ? "Yes" : "No"}
                </dd>
              </div>
            ))}
            <div>
              <dt className="eyebrow">Live now</dt>
              <dd className="font-display text-ink tabular mt-1 text-lg">
                {twitch.liveNow === null ? "—" : twitch.liveNow}
              </dd>
            </div>
          </dl>

          {twitch.clientIdHint ? (
            <p className="text-ink-dim mt-4 font-mono text-xs">
              {`client id ${twitch.clientIdHint}`}
            </p>
          ) : null}

          {twitch.problem ? (
            <p className="text-ink-muted mt-3 max-w-2xl text-sm leading-relaxed">
              {twitch.problem}
            </p>
          ) : (
            <p className="text-ink-dim mt-3 text-sm">
              The embedded players on /watch do not depend on any of this —
              they need only the `parent` list. These credentials add the live
              badge.
            </p>
          )}
        </CardBody>
      </Card>

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
