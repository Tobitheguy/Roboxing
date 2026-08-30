import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: { px: 24, cls: "size-6 text-[0.5rem] rounded" },
  md: { px: 40, cls: "size-10 text-xs rounded-md" },
  lg: { px: 64, cls: "size-16 text-base rounded-lg" },
  xl: { px: 96, cls: "size-24 text-2xl rounded-lg" },
} as const;

/**
 * "Titan Labs" -> "TL". Falls back to the first two characters for one-word names.
 *
 * Iterates code points rather than UTF-16 code units, so a name beginning with
 * an emoji or an astral-plane character yields that character instead of half a
 * surrogate pair rendered as a broken glyph.
 */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  }
  const first = Array.from(words[0])[0] ?? "";
  const last = Array.from(words[words.length - 1])[0] ?? "";
  return (first + last).toUpperCase();
}

/**
 * A team's crest, with an initials fallback.
 *
 * The fallback is not a placeholder to be replaced later — most teams in a new
 * league genuinely have no logo asset, and a monogram looks deliberate where a
 * broken image icon looks abandoned.
 */
export function TeamCrest({
  name,
  logoUrl,
  size = "md",
  decorative = false,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  /**
   * Set when the team name is already visible immediately next to the crest,
   * so assistive tech does not read it twice. Defaults to false: a crest
   * standing alone in a grid must announce which team it is, and `title` alone
   * does not do that — it is a mouse-hover affordance, not an accessible name.
   */
  decorative?: boolean;
  className?: string;
}) {
  const { px, cls } = SIZES[size];

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={decorative ? "" : `${name} crest`}
        width={px}
        height={px}
        className={cn("border-line bg-surface-2 border object-contain", cls, className)}
      />
    );
  }

  return (
    <span
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": `${name} crest` })}
      title={name}
      className={cn(
        "font-display border-line bg-surface-2 text-ink-muted inline-flex shrink-0 items-center justify-center border font-bold tracking-tight select-none",
        cls,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
