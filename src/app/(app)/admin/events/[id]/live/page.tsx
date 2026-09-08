import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";

import { LiveConsole } from "@/components/admin/live-console";
import { EventTime } from "@/components/event-time";
import { PageHeading, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getViewer } from "@/lib/auth";
import { getBoutsForEvent, getStreamForEvent } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Run of show",
  robots: { index: false, follow: false },
};

export default async function LiveConsolePage(
  props: PageProps<"/admin/events/[id]/live">,
) {
  const viewer = await getViewer();
  // The proxy already established that someone is signed in. This is the
  // allowlist half — a signed-in stranger must not reach the console that
  // controls the broadcast.
  if (!viewer?.isAdmin) redirect("/");

  const { id } = await props.params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) notFound();

  const [bouts, stream] = await Promise.all([
    getBoutsForEvent(event.id),
    getStreamForEvent(event.id),
  ]);

  return (
    <PageShell>
      <PageHeading
        eyebrow="Run of show"
        title={event.name}
        description={
          [event.venue, event.city].filter(Boolean).join(", ") || undefined
        }
        action={
          <Button asChild variant="outline">
            <Link href={`/events/${event.slug}`} target="_blank">
              <ExternalLink />
              Viewer page
            </Link>
          </Button>
        }
      />

      <p className="text-ink-muted -mt-4 mb-8 text-sm">
        <EventTime
          startsAt={event.startsAt.toISOString()}
          timeZone={event.timezone}
          city={event.city}
        />
      </p>

      <LiveConsole
        eventId={event.id}
        initialStatus={event.status}
        bouts={bouts}
        hasStream={Boolean(stream?.cfLiveInputId)}
      />
    </PageShell>
  );
}
