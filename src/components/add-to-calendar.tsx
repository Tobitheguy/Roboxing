import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { assumedEnd, nextIcsDate, toIcsDate, toIcsStamp } from "@/lib/ics";

/**
 * "Add to calendar" for an event.
 *
 * Two plain links, no JavaScript, no account. It is the lowest-commitment
 * thing a visitor can do that still means something — and unlike a follow on
 * someone else's platform, it puts us in front of them again on a date we
 * already know.
 *
 * This is the ONLY per-event reminder on the page, deliberately: an inline
 * email form used to sit below it, stacked right above the footer's identical
 * form, and reading the same ask twice made both look like boilerplate. Email
 * capture lives in the footer, once, on every page. The calendar entry is the
 * event-specific reminder; the list is the everything-after-it reminder.
 */
export function AddToCalendar({
  eventSlug,
  eventName,
  competitionName,
  startsAt,
  location,
  appUrl,
  allDay = false,
  timeZone = "UTC",
}: {
  eventSlug: string;
  eventName: string;
  competitionName: string;
  startsAt: Date;
  location?: string | null;
  appUrl: string;
  /** The start time was never announced — add a date-only entry. */
  allDay?: boolean;
  /** IANA zone of the venue. Only read when `allDay` is set. */
  timeZone?: string;
}) {
  const eventUrl = `${appUrl}/events/${eventSlug}`;

  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", eventName);
  // Google takes the same two forms as the .ics: YYYYMMDD/YYYYMMDD for an
  // all-day entry, timestamps for a timed one. Passing a timestamp range for
  // an event with no announced start would put a guessed hour into the
  // viewer's calendar and set an alarm for it.
  //
  // The all-day end is the NEXT day, not `assumedEnd` — a 150-minute event
  // ends on the day it started, and an end-exclusive range from a date to
  // itself is zero-length.
  const startDate = toIcsDate(startsAt, timeZone);
  google.searchParams.set(
    "dates",
    allDay
      ? `${startDate}/${nextIcsDate(startDate)}`
      : `${toIcsStamp(startsAt)}/${toIcsStamp(assumedEnd(startsAt))}`,
  );
  google.searchParams.set("details", `${competitionName} — ${eventUrl}`);
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
