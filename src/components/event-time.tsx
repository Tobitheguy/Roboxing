"use client";

import { useViewerTimeZone } from "@/lib/client-env";
import {
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
 * The viewer's half can only be resolved in the browser — the server has no
 * idea where the request came from, and guessing from a header would be wrong
 * often enough to be worse than useless. So the venue time renders on the
 * server (identical for everyone, no hydration mismatch) and the viewer's time
 * is added once hydrated. It is additive, so nothing shifts or disappears.
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
  const viewerTime =
    viewerZone && viewerZone !== timeZone
      ? formatTimeWithZone(date, viewerZone)
      : null;

  const venueLabel = city?.trim() || formatZoneLabel(date, timeZone);

  return (
    <span className={cn("tabular", className)}>
      {showDate ? (
        <>
          <time dateTime={startsAt}>{formatDate(date, timeZone)}</time>
          <span className="text-ink-dim"> · </span>
        </>
      ) : null}
      {viewerTime ? (
        <>
          <span>{viewerTime}</span>
          <span className="text-ink-dim"> · </span>
        </>
      ) : null}
      <span className={viewerTime ? "text-ink-muted" : undefined}>
        {formatTime(date, timeZone)} {venueLabel}
      </span>
    </span>
  );
}
