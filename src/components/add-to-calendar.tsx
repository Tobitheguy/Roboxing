import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { assumedEnd, toIcsStamp } from "@/lib/ics";

/**
 * "Add to calendar" for an event.
 *
 * Two plain links, no JavaScript, no account. This is what replaced the
 * "set a reminder" button from the original sketch: an email reminder would
 * have needed a subscribers table, an email provider, unsubscribe handling,
 * and a privacy notice — all outside V1's admin-only scope — to do a job the
 * viewer's own calendar already does better.
 */
export function AddToCalendar({
  eventSlug,
  eventName,
  competitionName,
  startsAt,
  location,
  appUrl,
}: {
  eventSlug: string;
  eventName: string;
  competitionName: string;
  startsAt: Date;
  location?: string | null;
  appUrl: string;
}) {
  const end = assumedEnd(startsAt);
  const watchUrl = `${appUrl}/watch/${eventSlug}`;

  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", eventName);
  google.searchParams.set("dates", `${toIcsStamp(startsAt)}/${toIcsStamp(end)}`);
  google.searchParams.set(
    "details",
    `${competitionName} — watch at ${watchUrl}`,
  );
  if (location) google.searchParams.set("location", location);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="lg">
        {/* A plain anchor, not a fetch — the browser's own download handling
            is what makes this work on iOS, where a Blob download does not. */}
        <a href={`/api/events/${eventSlug}/calendar.ics`} download>
          <CalendarPlus />
          Add to calendar
        </a>
      </Button>
      <Button asChild variant="outline" size="lg">
        <a href={google.toString()} target="_blank" rel="noopener noreferrer">
          Google Calendar
        </a>
      </Button>
    </div>
  );
}
