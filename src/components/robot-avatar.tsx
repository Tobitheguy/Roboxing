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
  decorative = false,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
  /**
   * Set when the robot name is already visible next to the avatar, so
   * assistive tech does not read it twice. Defaults to false — an avatar alone
   * in a roster grid must announce which robot it is.
   */
  decorative?: boolean;
  className?: string;
}) {
  const { px, cls } = SIZES[size];

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={decorative ? "" : name}
        width={px}
        height={px}
        className={cn("border-line bg-surface-2 border object-cover", cls, className)}
      />
    );
  }

  return (
    <span
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": name })}
      title={name}
      className={cn(
        "font-mono border-line bg-surface-2 text-ink-muted inline-flex shrink-0 items-center justify-center border font-semibold select-none",
        cls,
        className,
      )}
    >
      {/* Code points, not UTF-16 units — slicing a surrogate pair in half
          renders a broken glyph. */}
      {Array.from(name.trim()).slice(0, 2).join("").toUpperCase() || "??"}
    </span>
  );
}
