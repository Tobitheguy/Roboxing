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
              "font-display rounded-md border px-3 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition-colors",
              isActive
                ? "border-volt/40 bg-volt/10 text-volt"
                : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}
