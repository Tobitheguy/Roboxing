import { getAppUrl } from "@/lib/app-url";
import { requireViewer } from "@/lib/auth";
import { assumedEnd, buildEventIcs } from "@/lib/ics";
import { getEventBySlug } from "@/lib/queries";

/**
 * An .ics file for one event.
 *
 * This is the countdown hero's call to action: a real reason to come back,
 * with no subscribers table, no email provider and no unsubscribe flow to
 * build and maintain. The viewer's own calendar does the reminding.
 *
 * Behind the wall like everything else. A calendar file names an event, a
 * venue and a URL — and on a site where the schedule itself requires an
 * account, handing that out unauthenticated would be the one open door.
 *
 * The generation itself lives in @/lib/ics so it can be unit tested; a route
 * module may only export handlers.
 */

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/events/[slug]/calendar.ics">,
) {
  const gate = await requireViewer();
  if (gate instanceof Response) return gate;

  const { slug } = await ctx.params;
  const row = await getEventBySlug(slug);

  if (!row) {
    return new Response("Event not found", { status: 404 });
  }

  const { event, competitionName } = row;
  const url = `${getAppUrl()}/watch/${event.slug}`;

  const body = buildEventIcs({
    // Stable across regenerations so re-adding updates the existing entry
    // rather than creating a duplicate in the viewer's calendar.
    uid: `event-${event.id}@roboxing`,
    start: event.startsAt,
    end: assumedEnd(event.startsAt),
    summary: event.name,
    description: `${competitionName} — watch at ${url}`,
    location: [event.venue, event.city, event.country].filter(Boolean).join(", "),
    url,
    status: event.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      // Short cache: the file changes if the event is rescheduled.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
