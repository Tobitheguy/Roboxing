import * as React from "react";

import { cn } from "@/lib/utils";

/** Standard page width and gutters. Every route uses this. */
export function PageShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12", className)}
      {...props}
    />
  );
}

/** Page title block: eyebrow, heading, optional supporting line and action. */
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="font-display text-hero text-ink uppercase">{title}</h1>
        {description ? (
          <p className="text-ink-muted mt-3 max-w-2xl text-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
