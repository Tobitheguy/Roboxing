"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AnimatedMark } from "@/components/auth/animated-mark";

/** How long the mark holds before the app takes over. */
const HOLD_MS = 1400;

/**
 * Shows the animated mark, then goes.
 *
 * `router.replace` rather than `push`: this screen must not end up in the
 * back-stack. Pressing Back from inside the app should return you to whatever
 * you were doing before signing in, not drop you into a loading animation
 * that immediately throws you forward again.
 *
 * The destination is prefetched while the animation plays, so the hold is
 * doing double duty — it covers the fetch instead of adding to it.
 */
export function WelcomeHandoff({
  destination,
  greeting,
}: {
  destination: string;
  greeting: string | null;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  // Guards against the effect running twice under React Strict Mode and
  // firing two navigations.
  const navigated = useRef(false);

  useEffect(() => {
    router.prefetch(destination);

    const timer = window.setTimeout(() => {
      if (navigated.current) return;
      navigated.current = true;
      setLeaving(true);
      router.replace(destination);
    }, HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [router, destination]);

  return (
    <div
      className={`flex flex-col items-center text-center transition-opacity duration-300 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <AnimatedMark />

      {/* The status line is what a screen reader announces; the mark above is
          aria-hidden. `polite` rather than `assertive` — this is progress, not
          an alert. */}
      <p
        role="status"
        aria-live="polite"
        className="text-ink-muted mt-8 text-sm"
      >
        {greeting ? `Welcome back, ${greeting}. ` : ""}
        Taking you in&hellip;
      </p>

      {/* A determinate bar would be a lie: the wait is a prefetch of unknown
          length, not a measurable job. This is a track that fills once, in
          the time the screen is actually held. */}
      <div className="bg-line mt-6 h-px w-48 overflow-hidden">
        <div
          className="bg-volt h-full w-full origin-left"
          style={{
            animation: `welcome-fill ${HOLD_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
          }}
        />
      </div>

      <style>{`
        @keyframes welcome-fill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="welcome-fill"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
