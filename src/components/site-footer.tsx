import Link from "next/link";

import { NewsletterSignup } from "@/components/newsletter-signup";
import { RoboxingMark } from "@/components/roboxing-mark";
import { SocialIcon } from "@/components/social-icons";
import { FOOTER_ITEMS, LEGAL_ITEMS } from "@/lib/nav";
import { SOCIAL_ACCOUNTS } from "@/lib/social";

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

          {/* Directly under the mark, not out in the link row. These are the
              same organisation as the logo above them, and grouping them with
              the identity block says so — dropped among Teams/Watch/Machines
              they read as four more pages of this site.

              `rel="me"` is not decoration: it is the microformat that asserts
              "this profile is the same entity as this site", which is what
              lets a platform verify the link back. `noopener` because
              `target="_blank"` without it hands the opened tab a reference to
              this window. */}
          <nav aria-label="Roboxing on social media" className="mt-4">
            <ul className="flex items-center gap-4">
              {SOCIAL_ACCOUNTS.map((account) => (
                <li key={account.platform}>
                  <a
                    href={account.href}
                    target="_blank"
                    rel="me noopener noreferrer"
                    aria-label={account.name}
                    title={`${account.name} (${account.handle})`}
                    className="text-ink-muted hover:text-ink focus-visible:ring-ink/40 inline-flex rounded-xs p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <SocialIcon
                      platform={account.platform}
                      className="h-5 w-5"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
        <div className="text-ink-dim mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>
            Roboxing is an independent platform. Robot names, team names, and
            league marks belong to their respective owners.
          </p>
          <nav
            aria-label="Legal"
            className="flex shrink-0 flex-wrap gap-x-4 gap-y-1"
          >
            {LEGAL_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-ink transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
