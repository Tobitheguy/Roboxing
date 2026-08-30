import { cn } from "@/lib/utils";

/**
 * The Roboxing wordmark.
 *
 * Type-only by decision — no illustration, so a real brand pass later is a
 * change to this one component rather than a hunt for asset files. Rendered as
 * live text rather than a flattened SVG so it stays crisp at any size, respects
 * the user's text scaling, and is readable by screen readers and search engines.
 *
 * The X is volt and is the only coloured part of the mark, which is what lets
 * it survive being shrunk to a 24px favicon — and it sits at the seam of
 * "robo" and "boxing", which is the whole joke of the name.
 */
export function RoboxingMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  } as const;

  return (
    <span
      className={cn(
        "font-display text-ink leading-none font-bold tracking-[-0.03em] uppercase select-none",
        sizes[size],
        className,
      )}
    >
      Robo<span className="text-volt">x</span>ing
    </span>
  );
}
