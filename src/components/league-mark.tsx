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
 * Logos sit on a WHITE tile with a hairline border rather than on the league
 * colour: the marks were checked programmatically (all three current files
 * are dark-on-transparent or dark-on-white) and a coloured tile would fight
 * whatever palette the organizer chose.
 */
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
    return (
      <span
        aria-hidden
        className={cn(
          "border-line relative flex shrink-0 items-center justify-center overflow-hidden border bg-white p-1",
          SIZES[size],
          className,
        )}
      >
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes="56px"
          className="object-contain p-1"
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
