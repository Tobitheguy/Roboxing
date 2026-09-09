/**
 * The site's public base URL.
 *
 * Needed anywhere an absolute URL has to be embedded in something that leaves
 * the page — calendar files, OG tags, share links. Prefers the explicit
 * APP_URL, falls back to the deployment Vercel gives us, and only then to the
 * known production host.
 */
export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");

  // Vercel sets this to the production domain for production deployments.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  /*
   * The canonical domain, not the Vercel one. This said roboxing.vercel.app
   * until 2026-09-09, months after roboxing.tv became the real host, and it
   * surfaced the way stale fallbacks always do: a newsletter sent from a local
   * script — no APP_URL in the environment — rendered every link, including
   * the unsubscribe, against the old domain. Production was fine, because
   * APP_URL is set there. Everywhere else was quietly wrong.
   *
   * A fallback is read exactly when nobody is watching. It has to be the
   * answer you would want in the worst case, not the answer that was true
   * when it was written.
   */
  return "https://roboxing.tv";
}
