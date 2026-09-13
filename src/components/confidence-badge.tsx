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
 * DIR_03: ONE HUE AT THREE DENSITIES.
 * ----------------------------------
 * Confirmed is a solid cyan fill. Reported is the same cyan as a 2px outline
 * with nothing inside it. Unconfirmed is a dashed steel outline with the
 * colour gone entirely.
 *
 * The point is scanning, not decoration: a reader learns it in two cards and
 * can then read a whole results table at a glance, because an unresolved row
 * is visible from across the page — the colour has dropped out of it.
 *
 * NEVER RED. A confidence label is not a warning, and `unconfirmed` does not
 * mean wrong — it means one source, or two that disagree, which is the normal
 * state of a sport covered mostly by outlets that do not publish in English.
 * Red on this site means exactly one thing: broadcasting right now.
 *
 * No icons. The old version carried a lucide glyph per state; at 11px beside a
 * 700-weight mono word the glyph was noise, and the three treatments are
 * already distinguishable without colour vision — filled, solid outline,
 * dashed outline.
 */

const VARIANTS: Record<
  ConfidenceValue,
  { label: string; title: string; className: string }
> = {
  confirmed: {
    label: "Confirmed",
    title: "Stated by the promoter, or reported by two independent sources.",
    // The filled variant carries no border of its own to account for, so it
    // gets the larger padding — the three chips end up optically identical.
    className: "chip-confirmed px-2.5 py-[5px]",
  },
  reported: {
    label: "Reported",
    title: "One credible source. Not independently corroborated.",
    className: "chip-reported px-2 py-[3px]",
  },
  unconfirmed: {
    label: "Unconfirmed",
    title:
      "Circulating, inferred, or the available sources contradict each other.",
    className: "chip-unconfirmed px-2 py-[3px]",
  },
};

export function ConfidenceBadge({
  level,
  className,
  showLabel = true,
}: {
  level: ConfidenceValue;
  className?: string;
  /**
   * Icon-only is gone — there is no icon. Kept in the signature because ~20
   * call sites pass it, and a chip with no word is not readable anyway: the
   * three densities distinguish the states, but only the word names them.
   */
  showLabel?: boolean;
}) {
  const variant = VARIANTS[level];
  return (
    <span
      // `title` rather than a tooltip component: this has to work on a
      // server-rendered row with no client JS, and the definition matters more
      // than the interaction.
      title={variant.title}
      className={cn(
        "font-mono inline-flex shrink-0 items-center text-[11px] font-bold tracking-[0.1em] uppercase",
        variant.className,
        className,
      )}
    >
      {variant.label}
      {showLabel ? null : null}
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
      className={cn("text-xs underline underline-offset-2", className)}
    >
      {label}
    </a>
  );
}
