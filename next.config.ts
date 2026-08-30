import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this Turbopack walks up looking for a
  // lockfile and finds an unrelated one in the home directory, which makes the
  // build's module resolution depend on whatever happens to be above the repo.
  turbopack: {
    root: import.meta.dirname,
  },

  images: {
    // Team crests, robot photos, and event posters are uploaded to Cloudflare
    // R2 and served from its public bucket domain. Next refuses to optimise a
    // remote host that is not listed here, so this has to exist before the
    // first image lands rather than being discovered as a 400 in production.
    //
    // If R2_PUBLIC_URL is later pointed at a custom domain, add that hostname
    // here too — the r2.dev pattern will not cover it.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.cloudflarestream.com",
      },
    ],
  },
};

export default nextConfig;
