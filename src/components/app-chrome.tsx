import { Suspense, type ReactNode } from "react";

import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * The frame every signed-in page sits in.
 *
 * Extracted because two places need it and they are not in a
 * parent/child relationship: the `(app)` layout, and the member half of `/`
 * — which had to move outside `(app)` so the landing page could own the same
 * route for signed-out visitors. Duplicating four lines would have been
 * fine right up until one of them changed in only one place.
 */
export function AppChrome({ children }: { children: ReactNode }) {
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
