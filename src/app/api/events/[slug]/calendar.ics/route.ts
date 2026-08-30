import { getAppUrl } from "@/lib/app-url";
import { assumedEnd, buildEventIcs } from "@/lib/ics";
import { getEventBySlug } from "@/lib/queries";

/**
 * An .ics file for one event.
 *
 * This is the countdown hero's call to action. It gives a visitor a real
 * reason to come back without a fan account, a subscribers table, an email
 * provider, or an unsubscribe flow — which is what "set a reminder" would
 * otherwise have required, all of it outside V1's admin-only scope.
 *
 * The generation itself lives in @/lib/ics so it can be unit tested; a route
 * module may only export handlers.
 */

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/events/[slug]/calendar.ics">,
) {
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
