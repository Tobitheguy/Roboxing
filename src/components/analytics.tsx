"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics, with two deliberate subtractions.
 *
 * WHY THIS FILE EXISTS AT ALL rather than `<Analytics />` in the root layout:
 * `beforeSend` is a function, and a function cannot be passed from a server
 * component to a client component. The wrapper is the only way to redact.
 *
 * WHY WEB ANALYTICS AND NOT GOOGLE ANALYTICS OR PLAUSIBLE. The privacy policy
 * says there is no banner on this site, and that claim has to survive the
 * decision to start measuring. Vercel Web Analytics sets no cookie and writes
 * nothing to the browser — visitors are counted by a hash of the incoming
 * request that is discarded after 24 hours — so there is no consent to collect
 * under ePrivacy and the "no banner" promise stays true. Google Analytics would
 * have cost us that promise on day one.
 *
 * WHAT IS SUBTRACTED, and both are on purpose:
 *
 * 1. `/admin` and `/account` are never reported. Two different reasons that
 *    happen to point the same way. Admin traffic is Tobias looking at his own
 *    site, and counting it makes every number a lie about strangers — with an
 *    audience this small, one editing session outweighs a day of real readers.
 *    `/account` is the signed-in half, where a path is a statement about a
 *    identifiable person rather than about a page. The policy promises this
 *    explicitly, so it is load-bearing: deleting a prefix here makes
 *    /privacy wrong.
 *
 * 2. Query strings are dropped except for the attribution parameters below.
 *    Today nothing sensitive rides in a page URL — the newsletter's confirm and
 *    unsubscribe tokens live on `/api/newsletter/*`, which is a route handler,
 *    never a page view, so the script never sees them. This is defence against
 *    the future: the day somebody adds `?token=` or `?email=` to a real page,
 *    the allowlist means it is already not being sent. A denylist would have to
 *    be remembered at exactly the wrong moment.
 *
 * The allowlist keeps what tells us whether a post worked — which is the entire
 * reason for switching measurement on.
 */
const PRIVATE_PREFIXES = ["/admin", "/account"] as const;

const ATTRIBUTION_PARAMS = new Set([
  "ref",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

function isPrivate(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        let url: URL;
        try {
          url = new URL(event.url);
        } catch {
          // An unparseable URL is not worth guessing at. Dropping the event
          // loses one data point; forwarding a string we could not inspect
          // forwards whatever is in it.
          return null;
        }

        if (isPrivate(url.pathname)) return null;

        for (const key of [...url.searchParams.keys()]) {
          if (!ATTRIBUTION_PARAMS.has(key)) url.searchParams.delete(key);
        }

        return { ...event, url: url.toString() };
      }}
    />
  );
}
