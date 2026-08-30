import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { LivePill } from "@/components/live-pill";
import { MainNav } from "@/components/main-nav";
import { RoboxingMark } from "@/components/roboxing-mark";
import { ViewerMenu } from "@/components/viewer-menu";
import { getLiveNow, type LiveNow } from "@/lib/live";
import { rethrowControlFlow } from "@/lib/next-errors";

/**
 * Resolves "is anything broadcasting right now" for the header pill.
 *
 * Split out and wrapped in Suspense at the call site so the shell can paint
 * without waiting on a database round trip. Note this does NOT keep the route
 * static — without Cache Components enabled, any request-time read forces the
 * whole route to render on demand. That is the correct trade here: a LIVE
 * badge frozen at build time would be worse than useless on a site whose
 * entire premise is that the page changes while you are watching it.
 */
async function LiveNowPill({ variant }: { variant: "mobile" | "desktop" }) {
  // Request-time, not build-time. This is the single most important line in
  // the shell: without it Next prerenders the pill's ABSENCE into static HTML
  // at build, and the LIVE badge never appears no matter what is actually
  // broadcasting — a bug that would only surface on event day.
  await connection();

  let live: LiveNow = null;
  try {
    live = await getLiveNow();
  } catch (error) {
    // Suspense catches suspensions, not thrown errors. This component renders
    // inside the root layout, so an uncaught Neon failure here would 500 every
    // page on the site. Losing the badge is a far better outcome — but Next's
    // own control-flow signals must still get through.
    rethrowControlFlow(error);
    console.error("[SiteHeader] could not resolve live state:", error);
    return null;
  }

  if (!live) return null;

  return (
    <LivePill
      href={`/watch/${live.eventSlug}`}
      label={`Live · ${live.eventName}`}
      className={variant === "mobile" ? "md:hidden" : undefined}
    />
  );
}

export function SiteHeader() {
  return (
    <header className="border-line bg-canvas/85 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="rounded-md" aria-label="Roboxing home">
            <RoboxingMark />
          </Link>

          {/* On a phone the live pill sits next to the mark so it is visible
              without scrolling the nav strip. */}
          <Suspense fallback={null}>
            <LiveNowPill variant="mobile" />
          </Suspense>
        </div>

        <MainNav className="md:ml-2" />

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:block">
            <Suspense fallback={null}>
              <LiveNowPill variant="desktop" />
            </Suspense>
          </div>
          {/* Suspense because ViewerMenu reads Clerk and the database; the
              shell must paint without waiting on either. */}
          <Suspense fallback={<div className="size-8" />}>
            <ViewerMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
