import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonitorPlay, Swords } from "lucide-react";

import { AddToCalendar } from "@/components/add-to-calendar";
import { Badge } from "@/components/badge";
import { BoutList } from "@/components/bout-row";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { Countdown } from "@/components/countdown";
import { EmptyState } from "@/components/empty-state";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { PageShell } from "@/components/page-shell";
import { getAppUrl } from "@/lib/app-url";
import { getBoutsForEvent, getEventBySlug } from "@/lib/queries";

export async function generateMetadata(
  props: PageProps<"/watch/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const row = await getEventBySlug(slug);
  return {
    title: row?.event.name ?? "Watch",
    description: row
      ? `${row.competitionName} — ${row.event.name}. Full card, results, and live stream.`
      : undefined,
  };
}

export default async function WatchEventPage(
  props: PageProps<"/watch/[slug]">,
) {
  const { slug } = await props.params;
  const row = await getEventBySlug(slug);
  if (!row) notFound();

  const { event, competitionSlug, competitionName } = row;
  const bouts = await getBoutsForEvent(event.id);
  const appUrl = getAppUrl();

  const isLive = event.status === "live";
  const isCompleted = event.status === "completed";
  const location = [event.venue, event.city, event.country]
    .filter(Boolean)
    .join(", ");

  return (
    <PageShell>
      <div className="mb-6">
        <p className="eyebrow mb-2">
          <Link
            href={`/competitions/${competitionSlug}`}
            className="hover:text-volt transition-colors"
          >
            {competitionName}
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display text-hero text-ink uppercase">
            {event.name}
          </h1>
          {isLive ? <LivePill status="live" /> : null}
          {event.status === "cancelled" ? (
            <Badge variant="danger">Cancelled</Badge>
          ) : null}
        </div>
        <p className="text-ink-muted mt-3 text-sm">
          <EventTime
            startsAt={event.startsAt.toISOString()}
            timeZone={event.timezone}
            city={event.city}
          />
          {location ? (
            <span className="text-ink-dim"> · {location}</span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ------------------------------------------------------------- */}
        {/* Player. The real one lands in step 4 — this is the slot it     */}
        {/* occupies, sized at 16:9 so the layout does not shift when it   */}
        {/* arrives.                                                       */}
        <div>
          <div className="border-line bg-surface relative aspect-video w-full overflow-hidden rounded-lg border">
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="text-ink-dim border-line bg-surface-2 mb-4 flex size-12 items-center justify-center rounded-lg border">
                <MonitorPlay className="size-6" />
              </div>
              <p className="font-display text-ink text-base font-semibold uppercase">
                {isLive
                  ? "Stream not connected"
                  : isCompleted
                    ? "No recording yet"
                    : "Not started"}
              </p>
              <p className="text-ink-muted mt-2 max-w-sm text-sm">
                The Roboxing player is wired up in the next build step. Until
                then this page carries the card and the results.
              </p>
            </div>
          </div>

          {!isLive && !isCompleted ? (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Countdown
                startsAt={event.startsAt.toISOString()}
                className="font-display text-volt text-2xl font-bold"
              />
              <AddToCalendar
                eventSlug={event.slug}
                eventName={event.name}
                competitionName={competitionName}
                startsAt={event.startsAt}
                location={location}
                appUrl={appUrl}
              />
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Fight card.                                                    */}
        <Card className="lg:sticky lg:top-24 lg:self-start">
          <CardHeader
            title="Fight card"
            action={
              <span className="text-ink-dim tabular text-xs">
                {bouts.length} {bouts.length === 1 ? "bout" : "bouts"}
              </span>
            }
          />
          <CardBodyFlush>
            {bouts.length > 0 ? (
              <BoutList bouts={bouts} />
            ) : (
              <EmptyState
                icon={<Swords />}
                title="Card not announced"
                description="Bouts appear here once the organizer confirms the running order."
              />
            )}
          </CardBodyFlush>
          {bouts.length > 0 ? (
            <CardBody className="border-line border-t">
              <p className="text-ink-dim text-xs">
                Listed in running order — the last bout is the main event.
              </p>
            </CardBody>
          ) : null}
        </Card>
      </div>
    </PageShell>
  );
}
