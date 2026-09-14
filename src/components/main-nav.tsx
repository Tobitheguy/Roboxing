"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * The primary nav links.
 *
 * Client-side only because it needs the current pathname to mark the active
 * item. On a phone this becomes a horizontally scrollable strip rather than a
 * hamburger menu: five destinations do not justify hiding navigation behind a
 * tap, and a visible strip tells a first-time visitor what the site contains.
 *
 * DIR_03: monospace, not the display face. Every nav item is a bordered box at
 * 2px with zero radius; the active one fills cyan with dark ink on top. That
 * is the same treatment the confidence chips use — filled means certain, and
 * "you are here" is the one certainty a nav can offer.
 *
 * THE SUBMENU OPENS ON HOVER AND ON FOCUS, AND THE PARENT STILL NAVIGATES.
 *
 * Tobias asked for UFC's Events menu. Theirs opens a panel on hover; the
 * version here does the same with CSS only — `group-hover` plus
 * `group-focus-within`, no state, no effect, no click-outside listener. That
 * matters more than it sounds: a dropdown built on React state has to solve
 * hover-out, escape, tab-away and route-change, and each of those is a place
 * for the menu to stick open. The CSS version cannot stick.
 *
 * The parent is a real link, not a label. Hover does not exist on a
 * touchscreen, so a parent that only opens a menu is a dead item on a phone —
 * tapping "Events" there goes to the schedule, which is what a visitor asking
 * for events most likely wants.
 *
 * NO CARET. It had one, and Tobias asked for it gone. He is right on the
 * merits too: a caret is a promise that something is hidden, and this item
 * already goes somewhere by itself. The affordance is that the menu opens
 * when the pointer arrives — which it does, immediately — and on a
 * touchscreen the caret was promising a menu that cannot open at all.
 */
export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  /** A parent lights up when any of its children is the current page. */
  const isBranchActive = (item: NavItem) =>
    isActive(item.href) || (item.children?.some((c) => isActive(c.href)) ?? false);

  const boxClass = (active: boolean) =>
    cn(
      "font-mono border-2 px-3 py-2 text-xs tracking-[0.1em] whitespace-nowrap uppercase transition-colors",
      active
        ? "border-volt bg-volt text-volt-ink"
        : "border-line text-ink-muted hover:border-volt hover:text-ink",
    );

  return (
    <nav
      aria-label="Main"
      className={cn(
        // no-scrollbar + scroll-fade-x come from shadcn's stylesheet. The fade
        // is the affordance: without it, five items on a 375px screen clip at
        // the edge with no cue that "Leagues" exists off to the right.
        //
        // THE MASK HAS TO GO AWAY WHERE THE SUBMENU OPENS.
        //
        // `scroll-fade-x` works by setting `mask-image`, and a mask clips its
        // element's descendants to that element's own box — so the Events
        // panel rendered with display:block, the right size and the right
        // position, and was then masked out of existence because it hangs
        // below the nav strip. It survived removing the header's backdrop
        // blur and a z-index of 9999, which is what finally pointed at a mask
        // rather than a stacking problem.
        //
        // overflow-visible from md up is the other half. Below md the strip
        // scrolls and keeps its fade; there is no hover on a touchscreen
        // anyway, and the parent link goes somewhere real.
        "no-scrollbar scroll-fade-x -mx-4 flex items-center gap-1 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0",
        "md:[-webkit-mask-image:none] md:[mask-image:none]",
        className,
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = isBranchActive(item);

        if (!item.children?.length) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={boxClass(active)}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <div key={item.label} className="group relative">
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={boxClass(active)}
            >
              {item.label}
            </Link>

            {/*
             * `pt-1` on the wrapper rather than `mt-1` on the panel: a margin
             * would put a one-pixel gap of nothing between the parent and the
             * menu, and the hover drops the instant the pointer crosses it.
             * Padding keeps the hover target continuous.
             */
            }
            <div
              className={cn(
                "absolute top-full left-0 z-50 hidden pt-1",
                "group-hover:block group-focus-within:block",
              )}
            >
              <div className="border-volt bg-surface flex min-w-[11rem] flex-col border-2">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    aria-current={isActive(child.href) ? "page" : undefined}
                    className={cn(
                      "font-mono border-line hover:bg-surface-2 border-b-2 px-3 py-2.5 text-xs tracking-[0.1em] uppercase transition-colors last:border-b-0",
                      isActive(child.href)
                        ? "text-volt"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
