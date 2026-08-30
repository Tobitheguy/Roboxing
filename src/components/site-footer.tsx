import Link from "next/link";

import { RoboxMark } from "@/components/robox-mark";
import { NAV_ITEMS } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="border-line mt-16 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between md:px-6">
        <div>
          <RoboxMark size="sm" />
          <p className="text-ink-dim mt-2 max-w-xs text-xs">
            Live humanoid robot combat — streams, standings, and fight history.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-ink-muted hover:text-ink text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/styleguide"
            className="text-ink-dim hover:text-ink text-sm transition-colors"
          >
            Styleguide
          </Link>
        </nav>
      </div>

      <div className="border-line border-t">
        <div className="text-ink-dim mx-auto max-w-7xl px-4 py-4 text-xs md:px-6">
          Robox is an independent platform. Robot names, team names, and league
          marks belong to their respective owners.
        </div>
      </div>
    </footer>
  );
}
