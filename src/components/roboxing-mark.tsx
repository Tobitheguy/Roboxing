import { cn } from "@/lib/utils";

/**
 * The wordmark: ROBOXING, the R split in two — in the same typeface as the
 * rest of the word, because it IS the rest of the word.
 *
 * Third and final iteration, each driven by Tobias's feedback:
 *  1. A geometric stencil R in a tile — rejected, "looks weird, normal R".
 *  2. His own SVG glyph as the first letter — rejected by him too: the glyph
 *     was a different typeface from OBOXING beside it. His files in /Logos
 *     were inspiration, not assets.
 *  3. This: the R is literally the display face's R, rendered as text, with
 *     the diagonal cut made of a TRANSPARENT stripe in a gradient clipped to
 *     the glyph. Same font by construction — it cannot drift — and the cut
 *     shows whatever is behind the mark, so it is "background-coloured" on
 *     every surface including the blurred sticky header.
 */
function SplitR({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        // The cut, matched to the logo file Tobias made (Logos/roboxing-r.svg)
        // rather than invented: measured from his path, the gap runs at about
        // 10 degrees — nearly horizontal, right side higher — through the
        // letter's waist, at roughly 11% of the letter's height. A 45-degree
        // slash was tried first and rejected; the shallow cut is his.
        //
        // 350deg = gradient axis 10 degrees off vertical, which tilts the
        // stripe 10 degrees off horizontal, rising to the right.
        //
        // var(--color-ink), NOT currentColor: the element's own color is set
        // to transparent so the gradient shows through the glyph, and
        // currentColor resolves against exactly that — a gradient built from
        // it paints nothing at all. Found the hard way: the header rendered
        // "OBOXING" with an invisible first letter.
        backgroundImage:
          // The sub-percent ramps at each edge are anti-aliasing: a HARD stop
          // ("ink 44%, transparent 44%") renders a stair-stepped edge on the
          // diagonal, and a ~0.7% transition is exactly one soft pixel at
          // header size — straight to the eye, smooth to the renderer.
          "linear-gradient(350deg, var(--color-ink) 0%, var(--color-ink) 44.5%, transparent 45.2%, transparent 51.3%, var(--color-ink) 52%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      R
    </span>
  );
}

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
      // Assistive tech gets the whole word once; the split R is decorative.
      role="img"
      aria-label="Roboxing"
      className={cn(
        "font-display text-ink leading-none font-bold tracking-[-0.03em] uppercase select-none",
        sizes[size],
        className,
      )}
    >
      <SplitR />
      <span aria-hidden>oboxing</span>
    </span>
  );
}
