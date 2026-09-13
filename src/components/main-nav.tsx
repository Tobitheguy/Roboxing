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
 * hamburger menu: six destinations do not justify hiding navigation behind a
 * tap, and a visible strip tells a first-time visitor what the site contains.
 *
 * DIR_03: monospace, not the display face. Every nav item is a bordered box at
 * 2px with zero radius; the active one fills cyan with dark ink on top. That
 * is the same treatment the confidence chips use — filled means certain, and
 * "you are here" is the one certainty a nav can offer.
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
              "font-mono border-2 px-3 py-2 text-xs tracking-[0.1em] whitespace-nowrap uppercase transition-colors",
              active
                ? "border-volt bg-volt text-volt-ink"
                : "border-line text-ink-muted hover:border-volt hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
