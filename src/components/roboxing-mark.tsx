import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The wordmark: the split R as a tile, then ROBOXING in the display face.
 *
 * FOURTH ITERATION, AND THE FIRST THAT USES THE ACTUAL FILE.
 *
 * The previous three were attempts to CONSTRUCT the R in the browser. The last
 * of them rendered the display font's own R and cut it with a transparent
 * stripe in a clipped gradient — same typeface by construction, and the cut
 * measured off Tobias's own SVG at about 10 degrees through the letter's waist.
 *
 * That worked precisely because it was tuned to Oswald. DIR_03 replaces the
 * display face with Anton, which is far heavier and narrower, and the stripe
 * landed in the wrong place on a letter of the wrong width — the header
 * rendered a black slab over the first glyph. A mark built from whatever font
 * happens to be loaded is a mark that breaks on the next type decision.
 *
 * So it is the SVG now, which is also what DIR_03 asks for: "the split R, as
 * drawn, from the existing SVG". The file is Tobias's own drawing and cannot
 * drift.
 *
 * `invert` in the class list, not a second asset: the file is black-on-
 * transparent and the ground is now void. On paper the inversion is dropped —
 * black on paper, white on void, never cyan. Cyan means certainty and a mark
 * cannot also carry a meaning.
 */
const SIZES = {
  sm: { tile: 20, text: "text-[17px]" },
  md: { tile: 26, text: "text-[22px]" },
  lg: { tile: 36, text: "text-[30px]" },
} as const;

export function RoboxingMark({
  size = "md",
  className,
}: {
  /** 24px is the documented minimum for the tile; `sm` is the styleguide only. */
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { tile, text } = SIZES[size];
  return (
    /* text-ink explicitly: the header wraps this in a Link, and the base rule
       paints anchors cyan. DIR_03 is unambiguous — the mark is "never cyan,
       never red, never a gradient". Cyan means certainty and a mark cannot
       also carry a meaning. */
    <span className={cn("text-ink flex items-center gap-2.5", className)}>
      <Image
        src="/roboxing-r.svg"
        alt=""
        width={tile}
        height={tile}
        priority
        aria-hidden
        style={{ width: tile, height: tile }}
        className="shrink-0 invert brightness-[1.15] [.on-paper_&]:invert-0 [.on-paper_&]:brightness-100"
      />
      <span className={cn("font-display tracking-[0.04em] uppercase", text)}>
        Roboxing
      </span>
    </span>
  );
}
