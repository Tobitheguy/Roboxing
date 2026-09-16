"use client";

import { Analytics } from "@vercel/analytics/next";

import { redactAnalyticsEvent } from "@/lib/analytics-redaction";

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
 * WHAT IS SUBTRACTED lives in `lib/analytics-redaction.ts`, with its tests,
 * because `/privacy` makes promises that hold only while that function does.
 * In short: `/admin` and `/account` are never reported, and query strings are
 * dropped except for an attribution allowlist.
 *
 * VERIFIED IN A BROWSER on 2026-09-15, which is the only check that works —
 * the script is injected client-side in a `useEffect`, so it is correctly
 * absent from server-rendered HTML and `curl` can never see it. Loading
 * /schedule produced `GET /<seed>/script.js 200` followed by
 * `POST /<seed>/view 200`. The path is randomised per build (Resilient Intake
 * in v2), so do not grep for `_vercel/insights` and conclude anything.
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={redactAnalyticsEvent} />;
}
