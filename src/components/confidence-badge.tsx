import { BadgeCheck, CircleHelp, FileText } from "lucide-react";

import type { ConfidenceValue } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * How well a fact is sourced, shown to the reader.
 *
 * This is the component that makes the site's claim checkable. "The
 * English-language record" is a claim about process, not volume, and a record
 * that renders a promoter's press release and a single Chinese newspaper's
 * account with identical confidence is not keeping that promise — it is just
 * well-organised hearsay.
 *
 * Deliberately not colour-coded red/amber/green. A red badge reads as "this is
 * wrong", and `unconfirmed` does not mean wrong — it means one source, or two
 * that disagree, which is the normal state of a sport covered mostly by
 * outlets that do not publish in English. Only `confirmed` gets an accent; the
 * other two are quiet, because the honest message is "here is how we know",
 * not "beware".
 */

const VARIANTS: Record<
  ConfidenceValue,
  { label: string; title: string; icon: typeof BadgeCheck; className: string }
> = {
  confirmed: {
    label: "Confirmed",
    title: "Stated by the promoter, or reported by two independent sources.",
    icon: BadgeCheck,
    className: "border-volt/40 text-volt",
  },
  reported: {
    label: "Reported",
    title: "One credible source. Not independently corroborated.",
    icon: FileText,
    className: "border-line text-ink-muted",
  },
  unconfirmed: {
    label: "Unconfirmed",
    title:
      "Circulating, inferred, or the available sources contradict each other.",
    icon: CircleHelp,
    className: "border-line text-ink-dim",
  },
};

export function ConfidenceBadge({
  level,
  className,
  showLabel = true,
}: {
  level: ConfidenceValue;
  className?: string;
  /** Icon only, for dense rows where the word would crowd the line. */
  showLabel?: boolean;
}) {
  const variant = VARIANTS[level];
  const Icon = variant.icon;
  return (
    <span
      // `title` rather than a tooltip component: this needs to work on a
      // server-rendered row with no client JS, and the definition matters more
      // than the interaction.
      title={variant.title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        variant.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {showLabel ? variant.label : <span className="sr-only">{variant.label}</span>}
    </span>
  );
}

/**
 * The source link that belongs next to a confidence badge.
 *
 * Renders nothing when there is no URL, which is a case worth keeping cheap:
 * plenty of rows on this site are sourced to reporting whose link was never
 * captured, and inventing a plausible one would be far worse than showing none.
 */
export function SourceLink({
  url,
  label = "Source",
  className,
}: {
  url: string | null | undefined;
  label?: string;
  className?: string;
}) {
  if (!url?.trim()) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        "text-ink-dim hover:text-ink text-xs underline underline-offset-2",
        className,
      )}
    >
      {label}
    </a>
  );
}
