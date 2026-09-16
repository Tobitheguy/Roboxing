/**
 * What the analytics beacon is allowed to say about a visitor.
 *
 * THIS IS A PRIVACY PROMISE EXPRESSED AS CODE. `/privacy` tells readers two
 * specific things: that `/account` and `/admin` page views are never reported,
 * and that web addresses are stripped of everything except the tags saying
 * which link brought them. Both sentences are true only for as long as this
 * function behaves. That is the same standing as `resolveEmbed()` — a claim on
 * a public page backed by a pure function and its tests, rather than by
 * remembering.
 *
 * It lives in `lib` rather than inline in `components/analytics.tsx` for one
 * reason: a function inside a component body cannot be unit tested, and an
 * untested privacy guarantee is a guarantee nobody has checked.
 */
export const PRIVATE_PREFIXES = ["/admin", "/account"] as const;

/**
 * Kept because they say which post or platform sent someone here, which is the
 * entire reason measurement was switched on.
 *
 * `ref` earns its place twice over: Vercel's UTM reporting needs the Web
 * Analytics Plus add-on, and Instagram and TikTok in-app browsers routinely
 * send no referrer at all — so a hand-written `?ref=ig` is the only attribution
 * that survives both. It must stay in this list or links already posted to
 * social go dark.
 */
export const ATTRIBUTION_PARAMS: ReadonlySet<string> = new Set([
  "ref",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Returns the event to send, or `null` to drop it entirely.
 *
 * An ALLOWLIST, never a denylist. Today no page URL carries anything sensitive
 * — the newsletter's confirm and unsubscribe tokens live on `/api/newsletter/*`,
 * which is a route handler and never a page view. The allowlist is defence
 * against the day somebody adds `?token=` or `?email=` to a real page, because
 * that is precisely the moment nobody remembers to update a denylist.
 */
export function redactAnalyticsEvent<E extends { url: string }>(
  event: E,
): E | null {
  let url: URL;
  try {
    url = new URL(event.url);
  } catch {
    // Dropping one unparseable event loses a data point. Forwarding a string we
    // could not inspect forwards whatever happens to be inside it.
    return null;
  }

  if (isPrivatePath(url.pathname)) return null;

  // Snapshot the keys first: deleting from `searchParams` while iterating it
  // skips entries.
  for (const key of [...url.searchParams.keys()]) {
    if (!ATTRIBUTION_PARAMS.has(key)) url.searchParams.delete(key);
  }

  return { ...event, url: url.toString() };
}
