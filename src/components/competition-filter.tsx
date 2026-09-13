import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Competition filter for /schedule and /results.
 *
 * Plain links rather than a select, so filtering works with no JavaScript, is
 * linkable and shareable, and each filtered view is its own cacheable URL.
 */
export function CompetitionFilter({
  competitions,
  active,
  basePath,
}: {
  competitions: { slug: string; name: string }[];
  /** The currently selected slug, or undefined for "all". */
  active?: string;
  basePath: string;
}) {
  if (competitions.length < 2) return null;

  const items = [{ slug: undefined, name: "All" }, ...competitions];

  return (
    <div className="no-scrollbar scroll-fade-x -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {items.map((item) => {
        const isActive = item.slug === active;
        return (
          <Link
            key={item.slug ?? "all"}
            href={item.slug ? `${basePath}?competition=${item.slug}` : basePath}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              /* Mono, matching the nav and the confidence chips. These were set
                 in the display face, which on strings like "CMG2026 ROBOT MECHA
                 FIGHTING COMPETITION" produced an unreadable condensed block.
                 A filter is a label, and labels on this site are monospace. */
              "font-mono border-2 px-3 py-2 text-[11px] tracking-[0.1em] whitespace-nowrap uppercase transition-colors",
              /* Filled when active — the same grammar as the nav and the
                 confidence chips. A tinted 10%-opacity fill reads as "sort of
                 selected"; filled or outlined is a state a reader can see from
                 across the page, which is the entire idea behind the chips. */
              isActive
                ? "border-volt bg-volt text-volt-ink"
                : "border-line text-ink-muted hover:border-volt hover:text-ink",
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}
