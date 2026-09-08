import Link from "next/link";

import { RoboxingMark } from "@/components/roboxing-mark";

/**
 * The screen in front of everything.
 *
 * No navigation, deliberately. A sign-in page with a menu bar invites you to
 * go and look at something else first, and on this site there is nothing else
 * to look at — every other route ends up back here. The only link is the mark
 * itself, and it points at this same page.
 *
 * The backdrop is a grid drawn in CSS rather than an image: it costs no
 * request, it cannot pop in late on a slow connection, and it stays sharp on
 * any display. This is the first thing anyone sees of Roboxing, so it renders
 * in the first paint or it is not worth having.
 *
 * Repainted for the light palette. The old version was a dark page with a lime
 * bloom, which stopped working the moment it sat next to a white Clerk card —
 * and the bloom itself was borrowed energy from a colour the brand no longer
 * uses. What replaces it is quieter and does more work: a technical grid, and
 * a single blue wash to place the accent once.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="bg-canvas relative flex min-h-dvh flex-col overflow-hidden">
      {/* Grid. Faint enough to read as texture rather than decoration —
          engineering paper, not a background image. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(to right, #e2e2dc 1px, transparent 1px), linear-gradient(to bottom, #e2e2dc 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 78%)",
        }}
      />
      {/* One accent wash, top centre. The accent appears once on this screen;
          a second would make neither of them mean anything. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 opacity-[0.10] blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 100%, #14161a 0%, transparent 70%)",
        }}
      />

      <header className="relative z-10 px-5 py-5 sm:px-10">
        {/* Home, not sign-in. This pointed at /sign-in back when that WAS the
            front door; once the landing page took that job, the mark started
            throwing people out of the middle of checkout and onto a different
            auth screen — which is exactly why the flow felt like two sign-up
            pages rather than one. */}
        <Link
          href="/"
          className="focus-visible:ring-volt focus-visible:ring-offset-canvas inline-flex rounded-sm focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
        >
          <RoboxingMark size="md" />
          <span className="sr-only">Roboxing — home</span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-5 pb-10 sm:items-center sm:px-6">
        {children}
      </main>

      <footer className="text-ink-dim relative z-10 px-5 py-5 text-xs sm:px-10">
        {/* No longer says "shown after sign-in". Nothing is behind sign-in
            any more — an account exists so you can make picks and keep a
            record, not to unlock reading. */}
        <p>
          An account is only needed to make picks and keep a record. Everything
          else on Roboxing is open.
        </p>
      </footer>
    </div>
  );
}
