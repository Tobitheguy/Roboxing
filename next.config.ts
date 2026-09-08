import type { NextConfig } from "next";

/**
 * Turn a base URL from the environment into a single-hostname remote pattern.
 *
 * Returns nothing when the variable is unset or unparseable, so a missing env
 * var fails closed (images 400) rather than opening the optimizer up.
 */
function remotePatternFor(baseUrl: string | undefined) {
  if (!baseUrl) return [];
  try {
    const { hostname, protocol } = new URL(baseUrl);
    if (protocol !== "https:") return [];
    return [{ protocol: "https" as const, hostname }];
  } catch {
    return [];
  }
}

const streamCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this Turbopack walks up looking for a
  // lockfile and finds an unrelated one in the home directory, which makes the
  // build's module resolution depend on whatever happens to be above the repo.
  turbopack: {
    root: import.meta.dirname,
  },

  images: {
    // Pinned to OUR bucket and OUR Stream account, derived from the environment.
    //
    // A wildcard like `**.r2.dev` would look equivalent and is not: r2.dev and
    // cloudflarestream.com are shared multi-tenant domains, so that pattern
    // turns /_next/image into an open resize proxy for every public R2 bucket
    // and Stream thumbnail on the internet. On a public repo that config is
    // readable by anyone, and Vercel bills image optimization by bandwidth.
    remotePatterns: [
      // YouTube's thumbnail CDN, for post-card posters. Static because it is
      // not our infrastructure and never changes per environment; narrow
      // because /vi/{id}/... is the only path we build (see embeds.ts) and
      // i.ytimg.com serves nothing user-controlled beyond video posters.
      { protocol: "https" as const, hostname: "i.ytimg.com" },
      ...remotePatternFor(process.env.R2_PUBLIC_URL),
      ...(streamCode
        ? [
            {
              protocol: "https" as const,
              hostname: `customer-${streamCode}.cloudflarestream.com`,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
