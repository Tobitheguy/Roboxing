import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A single number with a label. Records, points totals, knockdown counts,
 * viewer-facing spec figures.
 *
 * The value uses the display face and tabular figures so a row of tiles stays
 * optically aligned and does not jitter when a number changes during a live
 * event.
 */
export function StatTile({
  label,
  value,
  sub,
  emphasis = false,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Optional qualifier under the value — "3 KO", "since 2025". */
  sub?: React.ReactNode;
  /** Paints the value volt. One per group at most, or it stops meaning anything. */
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-surface border-line rounded-lg border px-4 py-3",
        className,
      )}
      {...props}
    >
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "font-display tabular mt-1.5 text-2xl leading-none font-bold sm:text-3xl",
          /*
           * Emphasis is SIZE, never colour.
           *
           * This used to paint the emphasised tile in `--color-volt`, which was
           * ink in the old palette — so "emphasis" meant nothing visually and
           * nobody noticed. DIR_03 makes volt cyan, and the result was one
           * random zero glowing cyan beside three white numbers: a reader looks
           * for the meaning and there is none.
           *
           * Cyan on this site means certainty — it belongs to confidence chips,
           * links and structure. A stat tile is not a claim about sourcing.
           */
          emphasis ? "text-ink sm:text-4xl" : "text-ink",
        )}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-ink-dim mt-1.5 text-xs">{sub}</div>
      ) : null}
    </div>
  );
}

/** Evenly spaced row of tiles that reflows to two columns on a phone. */
export function StatRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4",
        className,
      )}
      {...props}
    />
  );
}
