import Link from "next/link";
import { redirect } from "next/navigation";

import { requireVerifiedViewer } from "@/lib/auth";

/**
 * Admin shell and the allowlist gate.
 *
 * The proxy already established that someone is signed in; this is the half it
 * cannot do without a Clerk API call on every request — checking that the
 * signed-in person is actually on ADMIN_EMAILS. Putting it in the layout means
 * a new admin page is protected the moment it exists, rather than the moment
 * someone remembers to add a guard to it.
 *
 * `requireVerifiedViewer()` rather than `getViewer()`, so the second-factor
 * requirement survives the site going public. It used to arrive here inherited
 * from the site-wide gate in `(app)/layout.tsx`; that gate is gone, and without
 * this line administrators would be the only signed-in people on the site held
 * to a WEAKER standard than viewers — which is backwards, since they are the
 * ones who change results and hold the broadcast credential.
 */

const ADMIN_NAV = [
  { href: "/admin", label: "Events" },
  { href: "/admin/signals", label: "Signals" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/competitions", label: "Competitions" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/robots", label: "Robots" },
  { href: "/admin/import", label: "Import" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireVerifiedViewer("/admin");

  // A signed-in stranger gets sent to the public site, not to a "forbidden"
  // page — there is no reason to confirm to them that an admin area exists.
  if (!viewer.isAdmin) redirect("/");

  return (
    <div>
      <div className="border-line bg-surface/50 border-b">
        <nav
          aria-label="Admin"
          className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 md:px-6"
        >
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-display text-ink-muted hover:bg-surface-2 hover:text-ink rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
