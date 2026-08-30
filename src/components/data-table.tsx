import * as React from "react";

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
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  /** Describes the table for screen readers. Visually hidden. */
  caption?: string;
  /** Rendered in place of the table body when there are no rows. */
  empty?: React.ReactNode;
  /** Makes each row navigable. The link wraps the first cell's content. */
  rowHref?: (row: T) => string | undefined;
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
                  href && "hover:bg-surface-2 transition-colors",
                )}
              >
                {columns.map((col) => (
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
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
