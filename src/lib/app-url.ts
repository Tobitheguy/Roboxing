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

  return "https://roboxing.vercel.app";
}
