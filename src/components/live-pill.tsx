import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type LiveStatus =
  /** Broadcasting right now. */
  | "live"
  /** Playing, but the viewer has fallen behind the live edge. */
  | "drift"
  /** Nothing broadcasting. */
  | "offline";

/**
 * The only component in the system permitted to use --color-live.
 *
 * That restriction is the whole point: if a viewer sees this red anywhere on
 * Robox, something is broadcasting. Not an error, not a delete button, not a
 * decorative accent. Drift gets amber instead, because "you are watching, but
 * behind" is a different message from "this is happening now".
 */
export function LivePill({
  status = "live",
  label,
  href,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  status?: LiveStatus;
  /** Overrides the default label — e.g. an event name in the site header. */
  label?: React.ReactNode;
  /** Renders the pill as a link. Used for the header's jump-to-the-stream pill. */
  href?: string;
}) {
  const content = (
    <span
      className={cn(
        "font-display inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold tracking-[0.1em] uppercase transition-colors",
        status === "live" &&
          "border-live/40 bg-live/10 text-live hover:bg-live/20",
        status === "drift" &&
          "border-drift/40 bg-drift/10 text-drift hover:bg-drift/20",
        status === "offline" && "border-line bg-surface-2 text-ink-dim",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "live" && "bg-live pulse-live",
          status === "drift" && "bg-drift",
          status === "offline" && "bg-ink-dim",
        )}
      />
      {label ?? (status === "drift" ? "Behind live" : status === "offline" ? "Offline" : "Live")}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex rounded-md">
      {content}
    </Link>
  );
}
