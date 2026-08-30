"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * The primary nav links.
 *
 * Client-side only because it needs the current pathname to mark the active
 * item. On a phone this becomes a horizontally scrollable strip rather than a
 * hamburger menu: five destinations do not justify hiding navigation behind a
 * tap, and a visible strip tells a first-time visitor what the site contains.
 */
export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={cn(
        // no-scrollbar + scroll-fade-x come from shadcn's stylesheet. The fade
        // is the affordance: without it, five items on a 375px screen clip at
        // the edge with no cue that "Results" exists off to the right.
        "no-scrollbar scroll-fade-x -mx-4 flex items-center gap-1 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0",
        className,
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "font-display rounded-md px-3 py-1.5 text-sm font-semibold tracking-wide whitespace-nowrap uppercase transition-colors",
              active
                ? "bg-surface-2 text-volt"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
