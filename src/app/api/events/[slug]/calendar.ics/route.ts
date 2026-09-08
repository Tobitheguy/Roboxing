import { getAppUrl } from "@/lib/app-url";
import { assumedEnd, buildEventIcs } from "@/lib/ics";
import { getEventBySlug } from "@/lib/queries";

/**
 * An .ics file for one event.
 *
 * Public. It used to require a session, on the reasoning that a calendar file
 * names an event, a venue and a URL, and handing that out unauthenticated
 * would be the one open door on a site where even the schedule needed an
 * account. That reasoning died with the wall: the schedule is public now, so
 * the file contains nothing a visitor cannot read on the page it came from,
 * and the gate would only stop the visitor from doing the single most
 * committed thing available to them.
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
  const url = `${getAppUrl()}/events/${event.slug}`;

  // Where to actually watch, when it is not us. The whole reason someone adds
  // this entry is to be somewhere at a time; if that somewhere is another
  // site, the link belongs in the reminder rather than one click behind it.
  const watchLine = event.broadcastUrl
    ? ` Watch on ${event.broadcastName?.trim() || "the organizer's channel"}: ${event.broadcastUrl}`
    : "";

  const body = buildEventIcs({
    // Stable across regenerations so re-adding updates the existing entry
    // rather than creating a duplicate in the viewer's calendar.
    uid: `event-${event.id}@roboxing`,
    start: event.startsAt,
    end: assumedEnd(event.startsAt),
    summary: event.name,
    description: `${competitionName} — ${url}${watchLine}`,
    location: [event.venue, event.city, event.country].filter(Boolean).join(", "),
    url,
    status: event.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
    // A date-only entry when the organizer never announced a start time. The
    // alternative is an alarm in someone's calendar for an hour we invented.
    allDay: event.startTimeTbd,
    timeZone: event.timezone,
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
