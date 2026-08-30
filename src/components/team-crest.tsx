import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: { px: 24, cls: "size-6 text-[0.5rem] rounded" },
  md: { px: 40, cls: "size-10 text-xs rounded-md" },
  lg: { px: 64, cls: "size-16 text-base rounded-lg" },
  xl: { px: 96, cls: "size-24 text-2xl rounded-lg" },
} as const;

/** "Titan Labs" -> "TL". Falls back to the first two characters for one-word names. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
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
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { px, cls } = SIZES[size];

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} crest`}
        width={px}
        height={px}
        className={cn("border-line bg-surface-2 border object-contain", cls, className)}
      />
    );
  }

  return (
    <span
      aria-hidden
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
