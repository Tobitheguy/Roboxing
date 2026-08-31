"use client";

import { cn } from "@/lib/utils";

/**
 * The wordmark, animated, for the hand-off screen after signing in.
 *
 * Three things happen at once: the letters rise into place, a light sweeps
 * across them, and the X pulses. The X is the only part that carries the
 * accent colour anywhere in the brand, so it is the only part that pulses —
 * animating the whole mark would read as a loading spinner wearing a logo.
 *
 * All of it is CSS. No animation library, no Lottie file, no image: this
 * screen exists to cover a redirect that may take 300ms, and an animation
 * that arrives after the thing it was covering is worse than none.
 *
 * Under `prefers-reduced-motion` everything resolves instantly to its final
 * state. Vestibular disorders are not an edge case, and a full-screen sweep
 * is exactly the kind of motion that triggers them.
 */
export function AnimatedMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative select-none", className)}>
      <style>{`
        @keyframes roboxing-rise {
          from { opacity: 0; transform: translateY(0.35em); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes roboxing-sweep {
          from { transform: translateX(-130%); }
          to   { transform: translateX(230%); }
        }
        @keyframes roboxing-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.45; }
        }
        .roboxing-rise {
          animation: roboxing-rise 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .roboxing-sweep {
          animation: roboxing-sweep 1500ms cubic-bezier(0.22, 1, 0.36, 1) 320ms infinite;
        }
        .roboxing-pulse {
          animation: roboxing-pulse 1500ms ease-in-out 620ms infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .roboxing-rise,
          .roboxing-sweep,
          .roboxing-pulse {
            animation: none;
          }
          .roboxing-sweep { opacity: 0; }
        }
      `}</style>

      <div className="relative overflow-hidden px-2 py-1">
        <span
          className="font-display text-ink roboxing-rise block text-[clamp(2.5rem,11vw,4.5rem)] leading-none font-bold tracking-[-0.03em] uppercase"
          // The mark is decorative here — the page announces itself in text
          // below, and a screen reader spelling out a logo mid-redirect is
          // noise.
          aria-hidden
        >
          Robo<span className="text-volt roboxing-pulse">x</span>ing
        </span>

        {/* The sweep. Sits above the letters, masked to the mark's box. */}
        <span
          aria-hidden
          className="roboxing-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(100deg, transparent 0%, rgba(200,255,0,0.14) 45%, rgba(255,255,255,0.22) 50%, rgba(200,255,0,0.14) 55%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
