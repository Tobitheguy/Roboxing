"use client";

import { useNow } from "@/lib/client-env";
import { cn } from "@/lib/utils";

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function remainingBetween(now: number, target: number): Remaining | null {
  const ms = target - now;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Time until an event starts.
 *
 * Renders a reserved blank line on the server and during hydration. A
 * countdown computed during SSR is stale before the HTML reaches the browser
 * and would produce a hydration mismatch on every single request, so the first
 * honest value is the one the client computes.
 */
export function Countdown({
  startsAt,
  className,
  onComplete,
}: {
  startsAt: string;
  className?: string;
  /** Rendered once the target has passed — usually "Starting soon". */
  onComplete?: React.ReactNode;
}) {
  const target = new Date(startsAt).getTime();
  const now = useNow();

  if (now === null) {
    // Reserve the line so the layout does not jump when the value arrives.
    return <span className={cn("block h-[1em]", className)} aria-hidden />;
  }

  const remaining = remainingBetween(now, target);

  if (!remaining) {
    return <span className={className}>{onComplete ?? "Starting soon"}</span>;
  }

  const parts: Array<[number, string]> = [
    [remaining.days, "d"],
    [remaining.hours, "h"],
    [remaining.minutes, "m"],
  ];
  // Seconds only inside the final hour, where they actually mean something.
  if (remaining.days === 0 && remaining.hours === 0) {
    parts.push([remaining.seconds, "s"]);
  }

  return (
    <span
      className={cn("tabular", className)}
      // Not announced on every tick — a screen reader reading a clock aloud
      // once a second is unusable.
      aria-live="off"
    >
      {parts.map(([value, unit], i) => (
        <span key={unit}>
          {i > 0 ? " " : ""}
          {String(value).padStart(2, "0")}
          <span className="text-ink-dim">{unit}</span>
        </span>
      ))}
    </span>
  );
}
