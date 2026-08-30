"use client";

import { useSyncExternalStore } from "react";

/**
 * Client-only environment values, exposed the way React actually wants them.
 *
 * The viewer's timezone and the current time do not exist on the server. The
 * obvious implementation — useState(null) plus a setState in an effect — works
 * but triggers a cascading render on every mount and is flagged by React's own
 * lint rules. useSyncExternalStore expresses the same thing correctly: React
 * renders getServerSnapshot during SSR and hydration, then switches to the
 * real value, with no extra render pass and no hydration mismatch.
 */

/* -------------------------------------------------------------------------- */
/* Viewer timezone                                                             */
/* -------------------------------------------------------------------------- */

const viewerTimeZone: string | null =
  typeof Intl !== "undefined"
    ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? null)
    : null;

/** The zone never changes within a session, so there is nothing to subscribe to. */
function subscribeToNothing(): () => void {
  return () => {};
}

/** Returns null during SSR and hydration, the IANA zone thereafter. */
export function useViewerTimeZone(): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => viewerTimeZone,
    () => null,
  );
}

/* -------------------------------------------------------------------------- */
/* Ticking clock                                                               */
/* -------------------------------------------------------------------------- */

const listeners = new Set<() => void>();
let cachedNow = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribeToClock(onChange: () => void): () => void {
  listeners.add(onChange);

  if (timer === null) {
    cachedNow = Date.now();
    // One interval shared by every countdown on the page, rather than one per
    // component — a schedule page can easily show a dozen.
    timer = setInterval(() => {
      cachedNow = Date.now();
      for (const listener of listeners) listener();
    }, 1000);
  }

  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * Current epoch milliseconds, updated once a second.
 *
 * Returns null on the server and during hydration. A time computed during SSR
 * is stale before the HTML arrives, so rendering nothing until the browser
 * says otherwise is the only honest option.
 */
export function useNow(): number | null {
  const value = useSyncExternalStore(
    subscribeToClock,
    () => cachedNow,
    () => 0,
  );
  return value === 0 ? null : value;
}
