import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { LivePill } from "@/components/live-pill";
import { MainNav } from "@/components/main-nav";
import { RoboxingMark } from "@/components/roboxing-mark";
import { getLiveNow } from "@/lib/live";

/**
 * Resolves "is anything broadcasting right now" for the header pill.
 *
 * Split into its own component and wrapped in Suspense at the call site on
 * purpose. This runs inside the root layout, so it executes on every route —
 * once step 2 turns getLiveNow() into a real per-request Postgres query, an
 * un-isolated await here would drag every page on the site into dynamic
 * rendering, including the static content pages step 3 adds. Isolating it now
 * costs nothing; retrofitting it after step 3 means revisiting every page.
 */
async function LiveNowPill({ variant }: { variant: "mobile" | "desktop" }) {
  // Request-time, not build-time. This is the single most important correctness
  // line in the shell: without it Next prerenders the pill's ABSENCE into
  // static HTML at build, and the LIVE badge would never appear no matter what
  // is actually broadcasting — a bug that would only surface on event day.
  await connection();

  const live = await getLiveNow();
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

        <div className="ml-auto hidden md:block">
          <Suspense fallback={null}>
            <LiveNowPill variant="desktop" />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
