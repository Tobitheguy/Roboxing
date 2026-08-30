import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shown wherever real data has not arrived yet.
 *
 * This exists as a first-class primitive rather than an afterthought because a
 * pre-launch sports site is mostly empty by definition — no results before the
 * first event, no standings before the first result. An empty table that says
 * nothing reads as a bug; one that explains itself reads as a schedule.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="text-ink-dim border-line bg-surface-2 mb-4 flex size-10 items-center justify-center rounded-lg border [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-ink text-base font-semibold">{title}</p>
      {description ? (
        <p className="text-ink-muted mt-1.5 max-w-sm text-sm text-balance">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
