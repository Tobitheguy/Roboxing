import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The surface every block of content sits on. One elevation step above the
 * canvas, one hairline border, no shadow — the aesthetic is precision, and a
 * drop shadow on a near-black canvas reads as mud rather than depth.
 */
export function Card({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        // overflow-hidden so flush content (a DataTable's hovered last row)
        // is clipped by the card's rounded corners instead of squaring them off.
        "bg-surface border-line overflow-hidden rounded-lg border",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Section label plus an optional action on the right. The label is an eyebrow
 * rather than a heading by default because most cards on this site are one
 * item in a stack, not a document outline.
 */
export function CardHeader({
  title,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<"header">, "title"> & {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "border-line flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6",
        className,
      )}
      {...props}
    >
      <h2 className="eyebrow">{title}</h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4 sm:p-6", className)} {...props} />;
}

/**
 * For content that manages its own padding — most often a DataTable, which
 * needs its rows flush to the card edge.
 */
export function CardBodyFlush({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("", className)} {...props} />;
}
