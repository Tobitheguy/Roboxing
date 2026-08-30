"use client";

import { useViewerTimeZone } from "@/lib/client-env";
import {
  dayOffset,
  formatDate,
  formatTime,
  formatTimeWithZone,
  formatZoneLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * An event's start time in the viewer's timezone AND the venue's.
 *
 * A US audience watching an Asian league is usually watching at an odd hour and
 * needs both numbers: their own to know when to show up, the venue's to make
 * sense of the schedule they were sent.
 *
 * The date is the trap. 1:30 PM Sunday in Los Angeles is 4:30 AM Monday in
 * Singapore, so printing the venue's date beside the viewer's time — which is
 * what a naive implementation does — tells a US viewer to show up a day late.
 * Each time therefore carries its OWN date whenever the two disagree.
 *
 * The viewer's half can only be resolved in the browser; the server has no
 * idea where the request came from. So the venue's date and time render on the
 * server (identical for everyone, no hydration mismatch) and the viewer's are
 * added once hydrated.
 */
export function EventTime({
  startsAt,
  timeZone,
  city,
  className,
  showDate = true,
}: {
  /** ISO string — Dates do not survive the server/client boundary intact. */
  startsAt: string;
  timeZone: string;
  city?: string | null;
  className?: string;
  showDate?: boolean;
}) {
  const date = new Date(startsAt);
  const viewerZone = useViewerTimeZone();

  // Same zone as the venue: printing the identical time twice is just noise.
  const showViewer = Boolean(viewerZone && viewerZone !== timeZone);
  const venueLabel = city?.trim() || formatZoneLabel(date, timeZone);

  // How far the venue's calendar day sits from the viewer's.
  const offset =
    showViewer && viewerZone ? dayOffset(date, viewerZone, timeZone) : 0;

  const separator = <span className="text-ink-dim"> · </span>;

  if (!showViewer) {
    return (
      <span className={cn("tabular", className)}>
        {showDate ? (
          <>
            <time dateTime={startsAt}>{formatDate(date, timeZone)}</time>
            {separator}
          </>
        ) : null}
        {formatTime(date, timeZone)} {venueLabel}
      </span>
    );
  }

  return (
    <span className={cn("tabular", className)}>
      {showDate ? (
        <>
          <time dateTime={startsAt}>{formatDate(date, viewerZone!)}</time>
          {separator}
        </>
      ) : null}
      <span>{formatTimeWithZone(date, viewerZone!)}</span>
      {separator}
      <span className="text-ink-muted">
        {/* When the venue is on another calendar day, say so rather than
            letting the reader assume both times share the date above. With
            dates hidden entirely, a compact +1/−1 carries the same warning. */}
        {showDate && offset !== 0 ? (
          <>{formatDate(date, timeZone)} </>
        ) : null}
        {formatTime(date, timeZone)} {venueLabel}
        {!showDate && offset !== 0 ? (
          <span className="text-ink-dim">
            {offset > 0 ? " +1" : " −1"}
          </span>
        ) : null}
      </span>
    </span>
  );
}
