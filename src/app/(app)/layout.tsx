import { Suspense } from "react";

import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireVerifiedViewer } from "@/lib/auth";

/**
 * Everything behind the wall.
 *
 * The gate is here, in the layout, rather than repeated in each page — so a
 * page added tomorrow is protected by where it lives. The failure mode of the
 * alternative is a page that renders fine for its author, who is signed in,
 * and leaks to everyone else.
 *
 * This runs on every request under `(app)`, which is why `getViewer()` is
 * `cache()`d: the gate and whatever the page itself asks about the viewer
 * share one Clerk call and one database round trip.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireVerifiedViewer();

  return (
    <>
      {/* Suspense so the banner's database round trip does not block the
          shell from painting. Query FAILURE is handled inside DemoBanner
          itself with a try/catch — Suspense only catches components that
          suspend, never ones that throw. */}
      <Suspense fallback={null}>
        <DemoBanner />
      </Suspense>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
