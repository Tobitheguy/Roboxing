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
 * The backdrop is two flat gradients and a grid drawn in CSS rather than an
 * image: it costs no request, it cannot pop in late on a slow connection, and
 * it stays sharp on any display. This is the first thing anyone sees of
 * Roboxing, so it renders in the first paint or it is not worth having.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Grid. Faint enough to read as texture rather than decoration. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #26262f 1px, transparent 1px), linear-gradient(to bottom, #26262f 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 78%)",
        }}
      />
      {/* A single volt bloom, top centre. The accent appears once on this
          screen; a second one would make neither of them mean anything. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 opacity-[0.16] blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 100%, #c8ff00 0%, transparent 70%)",
        }}
      />

      <header className="relative z-10 px-5 py-6 sm:px-10 sm:py-8">
        <Link
          href="/sign-in"
          className="focus-visible:ring-volt inline-flex rounded-sm focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0f] focus-visible:outline-none"
        >
          <RoboxingMark size="md" />
          <span className="sr-only">Roboxing</span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-5 pb-16 sm:items-center sm:px-6 sm:pb-24">
        {children}
      </main>

      <footer className="text-ink-dim relative z-10 px-5 py-6 text-xs sm:px-10">
        <p>
          Roboxing is a demonstration build. Events and results shown after
          sign-in are placeholders, not a record of any real competition.
        </p>
      </footer>
    </div>
  );
}
