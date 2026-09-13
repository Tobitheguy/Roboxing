import Image from "next/image";

import { leagueIdentity, leagueMark } from "@/lib/league-identity";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-6 text-[0.5rem] rounded",
  md: "size-10 text-[0.65rem] rounded-md",
  lg: "size-14 text-sm rounded-lg",
} as const;

/**
 * A league's square mark: its real logo where we hold one, otherwise a
 * generated monogram on the league's colour.
 *
 * The logos are used the way every sports outlet uses league marks — to
 * identify the competition being reported on, next to reporting about it.
 * That is nominative use, the same convention that lets ESPN print an NFL
 * shield beside a score. The files live in /public/leagues, fetched from the
 * organizers' own official sites; if one of them ever objects, deleting the
 * file reverts that league to its monogram with no code change.
 *
 * Logos sit in an OUTLINED cell at one fixed size — DIR_03's rule, "their
 * colour, our grid". They used to sit on a white tile, which was invisible
 * furniture on the old light ground and a bright block behind every league
 * name on void.
 *
 * WHICH MARKS GET INVERTED, AND WHY IT IS A LIST AND NOT A FILTER.
 *
 * Every file in /public/leagues was measured — share of transparent pixels,
 * mean luminance of the opaque ones — and they fall into two groups:
 *
 *   dark glyph, transparent ground   cyberhero, engineai, rek, urkl, whrg
 *   opaque field of its own          ufb (green U on a black tile),
 *                                    unitree (dark wordmark on white)
 *
 * The first group is invisible on void and has to be normalised to white.
 * The second must NOT be: `brightness-0 invert` has no idea a pixel is
 * background, so it turned UFB's black tile into a solid white square — the
 * exact thing being fixed. Unitree's white JPEG ground inverts to near-black,
 * which disappears into the panel and leaves the wordmark legible, so it is
 * treated with the first group.
 *
 * Seven files, one honest list. A rule that reads pixel data at runtime would
 * be cleverer and would get UFB wrong the same way.
 */

/** Marks that bring their own dark field and must be left alone. */
const KEEPS_ITS_OWN_FIELD = new Set(["ufb"]);
export function LeagueMarkBadge({
  slug,
  name,
  logoUrl,
  size = "md",
  className,
}: {
  slug: string;
  name: string;
  /** Path under /public, from competitions.logo_url. Null → monogram. */
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (logoUrl) {
    const normalise = !KEEPS_ITS_OWN_FIELD.has(slug);
    return (
      <span
        aria-hidden
        className={cn(
          "border-line relative flex shrink-0 items-center justify-center overflow-hidden border-2 p-1",
          SIZES[size],
          className,
        )}
      >
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes="56px"
          className={cn(
            "object-contain p-1",
            normalise &&
              "brightness-0 invert [.on-paper_&]:brightness-100 [.on-paper_&]:invert-0",
          )}
        />
      </span>
    );
  }

  const identity = leagueIdentity(slug);
  const mark = leagueMark(slug, name);

  return (
    <span
      aria-hidden
      className={cn(
        "font-display flex shrink-0 items-center justify-center font-bold tracking-tight text-white select-none",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: identity.accent }}
    >
      {mark}
    </span>
  );
}
