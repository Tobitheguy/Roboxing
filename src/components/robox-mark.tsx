import { cn } from "@/lib/utils";

/**
 * The Robox wordmark.
 *
 * Type-only by decision — no illustration, so a real brand pass later is a
 * change to this one component rather than a hunt for asset files. Rendered as
 * live text rather than a flattened SVG so it stays crisp at any size, respects
 * the user's text scaling, and is readable by screen readers and search engines.
 *
 * The X is volt. It is the only part of the mark that carries colour, which is
 * what makes it survive being shrunk to a 24px favicon.
 */
export function RoboxMark({
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
        "font-display leading-none font-bold tracking-[-0.03em] text-ink uppercase select-none",
        sizes[size],
        className,
      )}
    >
      Robo<span className="text-volt">x</span>
    </span>
  );
}
