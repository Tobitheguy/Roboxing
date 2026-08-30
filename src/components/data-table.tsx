import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type Column<T> = {
  /** Stable identifier — also used as the React key for cells. */
  key: string;
  header: React.ReactNode;
  /** Screen-reader-only long form when the header is an abbreviation (P, W, Pts). */
  headerTitle?: string;
  align?: "left" | "right" | "center";
  /**
   * Numeric columns get tabular figures so digits stay in their lanes as
   * standings update mid-event. Set this on anything that renders a number.
   */
  numeric?: boolean;
  /** Hides the column below the sm breakpoint — for detail a phone does not need. */
  hideOnMobile?: boolean;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
};

/**
 * The one table in the system. Standings, fixtures, results, rosters, bout
 * history, and every admin list are all this component with different columns.
 *
 * It is a plain server-rendered table — no sorting state, no virtualisation, no
 * client JS. V1 datasets are a season at a time, and a table that ships zero
 * kilobytes of JavaScript is the right default for a site whose main job is to
 * not compete with a video player for the main thread.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  empty,
  rowHref,
  rowLabel,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  /** Describes the table for screen readers. Visually hidden. */
  caption?: string;
  /** Rendered in place of the table body when there are no rows. */
  empty?: React.ReactNode;
  /**
   * Makes each row navigable. A real anchor wraps the first cell's content and
   * stretches over the whole row, so the row is clickable by mouse, reachable
   * by keyboard, and announced as a link — rather than a div with a hover
   * colour that does nothing, which is what a click handler alone would give.
   */
  rowHref?: (row: T) => string | undefined;
  /** Accessible label for the row link. Defaults to the first cell's text. */
  rowLabel?: (row: T) => string;
  className?: string;
}) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    // Wide tables scroll inside their own container. The page body must never
    // scroll horizontally on a phone.
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-max border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-line border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                title={col.headerTitle}
                className={cn(
                  "eyebrow px-3 py-2.5 first:pl-4 last:pr-4 sm:first:pl-6 sm:last:pr-6",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  !col.align && "text-left",
                  col.hideOnMobile && "hidden sm:table-cell",
                  col.className,
                )}
              >
                {col.headerTitle ? (
                  <>
                    <span aria-hidden>{col.header}</span>
                    <span className="sr-only">{col.headerTitle}</span>
                  </>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={getRowKey(row, i)}
                className={cn(
                  "border-line/60 border-b last:border-b-0",
                  // `relative` anchors the stretched row link below.
                  href &&
                    "hover:bg-surface-2 focus-within:bg-surface-2 relative transition-colors",
                )}
              >
                {columns.map((col, colIndex) => {
                  const cell = col.render(row, i);
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5 first:pl-4 last:pr-4 sm:first:pl-6 sm:last:pr-6",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.numeric && "tabular font-display font-semibold",
                        col.hideOnMobile && "hidden sm:table-cell",
                        col.className,
                      )}
                    >
                      {href && colIndex === 0 ? (
                        <Link
                          href={href}
                          aria-label={rowLabel?.(row)}
                          // The ::after overlay makes the entire row a click
                          // target while the anchor itself stays inline, so
                          // the focus ring outlines the cell content rather
                          // than a full-width invisible box.
                          className="rounded-sm after:absolute after:inset-0 after:content-['']"
                        >
                          {cell}
                        </Link>
                      ) : (
                        cell
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
