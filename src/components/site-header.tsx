import Link from "next/link";

import { LivePill } from "@/components/live-pill";
import { MainNav } from "@/components/main-nav";
import { RoboxMark } from "@/components/robox-mark";
import { getLiveNow } from "@/lib/live";

export async function SiteHeader() {
  const live = await getLiveNow();

  return (
    <header className="border-line bg-canvas/85 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="rounded-md" aria-label="Robox home">
            <RoboxMark />
          </Link>

          {/* On a phone the live pill sits next to the mark so it is visible
              without scrolling the nav strip. */}
          {live ? (
            <LivePill
              href={`/watch/${live.eventSlug}`}
              label={`Live · ${live.eventName}`}
              className="md:hidden"
            />
          ) : null}
        </div>

        <MainNav className="md:ml-2" />

        <div className="ml-auto hidden md:block">
          {live ? (
            <LivePill
              href={`/watch/${live.eventSlug}`}
              label={`Live · ${live.eventName}`}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
