import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: { px: 28, cls: "size-7 text-[0.5rem] rounded" },
  md: { px: 44, cls: "size-11 text-xs rounded-md" },
  lg: { px: 72, cls: "size-18 text-lg rounded-lg" },
  xl: { px: 128, cls: "size-32 text-3xl rounded-lg" },
} as const;

/**
 * A robot's photo, with a fallback.
 *
 * Square rather than circular, and mono rather than the display face: robots
 * are equipment with model numbers, and a circular avatar reads as a person.
 * That distinction matters on a site where the competitors are machines.
 */
export function RobotAvatar({
  name,
  photoUrl,
  size = "md",
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { px, cls } = SIZES[size];

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={px}
        height={px}
        className={cn("border-line bg-surface-2 border object-cover", cls, className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "font-mono border-line bg-surface-2 text-ink-muted inline-flex shrink-0 items-center justify-center border font-semibold select-none",
        cls,
        className,
      )}
    >
      {name.trim().slice(0, 2).toUpperCase() || "??"}
    </span>
  );
}
