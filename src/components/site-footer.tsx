import Link from "next/link";

import { NewsletterSignup } from "@/components/newsletter-signup";
import { RoboxingMark } from "@/components/roboxing-mark";
import { FOOTER_ITEMS } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="border-line mt-16 border-t">
      {/* The list sits above the nav rather than beside it because it is the
          only thing in the footer anyone is meant to DO. It appears on every
          page for the same reason: a reader who arrived from a clip will land
          on an event, a robot or a result page, and almost never on the home
          page — so the one conversion point cannot live only there. */}
      <div className="border-line border-b">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <NewsletterSignup source="footer" className="max-w-xl" />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between md:px-6">
        <div>
          <RoboxingMark size="sm" />
          <p className="text-ink-dim mt-2 max-w-xs text-xs">
            Live humanoid robot combat — streams, standings, and fight history.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {FOOTER_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-ink-muted hover:text-ink text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-line border-t">
        <div className="text-ink-dim mx-auto max-w-7xl px-4 py-4 text-xs md:px-6">
          Roboxing is an independent platform. Robot names, team names, and league
          marks belong to their respective owners.
        </div>
      </div>
    </footer>
  );
}
