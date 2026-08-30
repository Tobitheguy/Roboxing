import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Small status and metadata label.
 *
 * Note there is no "live" variant here on purpose — live state is the LivePill
 * component, which is the only thing in the system allowed to use --color-live.
 * Keeping it out of the generic Badge API means nobody can accidentally paint a
 * decorative label in the one colour that is supposed to mean "broadcasting".
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-display text-[0.6875rem] font-semibold tracking-[0.08em] uppercase whitespace-nowrap",
  {
    variants: {
      variant: {
        /** Default metadata: weight class, venue, season. */
        default: "border-line bg-surface-2 text-ink-muted",
        /** Emphasis — a headline bout, a featured robot. */
        volt: "border-volt/30 bg-volt/10 text-volt",
        /** Solid fill. Use sparingly; one per view at most. */
        voltSolid: "border-transparent bg-volt text-volt-ink",
        /** A win, or a finish worth calling out. */
        win: "border-win/30 bg-win/10 text-win",
        /** A loss. Deliberately quiet. */
        loss: "border-line bg-transparent text-ink-dim",
        /** Something needs attention — an unresolved bout, a failed import. */
        warn: "border-drift/30 bg-drift/10 text-drift",
        /** Destructive or error. Not the same red as live. */
        danger: "border-destructive/30 bg-destructive/10 text-destructive",
        /** Outline only, for dense rows. */
        outline: "border-line-strong bg-transparent text-ink-muted",
      },
      size: {
        sm: "px-1.5 py-0 text-[0.625rem]",
        md: "",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/**
 * How a bout ended. Mapping lives here so every surface — fight card, robot
 * history, results page, admin console — labels a method identically.
 */
export type BoutMethod =
  | "ko"
  | "tko"
  | "decision"
  | "draw"
  | "dq"
  | "no_contest";

const METHOD_LABELS: Record<BoutMethod, string> = {
  ko: "KO",
  tko: "TKO",
  decision: "Decision",
  draw: "Draw",
  dq: "DQ",
  no_contest: "No contest",
};

const METHOD_VARIANTS: Record<
  BoutMethod,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  // A knockout is the highlight of the night and usually carries bonus points.
  ko: "volt",
  tko: "volt",
  decision: "default",
  draw: "outline",
  dq: "warn",
  no_contest: "outline",
};

export function MethodBadge({
  method,
  className,
  ...props
}: React.ComponentProps<"span"> & { method: BoutMethod }) {
  return (
    <Badge
      variant={METHOD_VARIANTS[method]}
      className={className}
      title={METHOD_LABELS[method]}
      {...props}
    >
      {METHOD_LABELS[method]}
    </Badge>
  );
}

export { badgeVariants, METHOD_LABELS };
