import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/app-url";

/**
 * One page is indexable: the landing page. Everything else is a redirect to a
 * sign-in form, and pointing a crawler at those wastes its budget and fills
 * Search Console with "Page with redirect" for pages working as intended.
 *
 * `allow` before `disallow` is not decoration — the order does not matter to
 * a crawler, but the SPECIFICITY does: "/$" anchors to the root exactly, so
 * "/schedule" is not covered by it and falls through to the disallow.
 *
 * This mirrors what Netflix does, which is worth knowing because it looks
 * wrong at first glance: their robots.txt opens with `Disallow: /` for `*`
 * and then names Googlebot, Bingbot, Applebot, GPTBot and a dozen others to
 * let them in. They are not hiding — they are choosing which crawlers get
 * through. Roboxing has one page worth crawling, so it says so directly
 * instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/$",
        disallow: "/",
      },
    ],
    host: getAppUrl(),
  };
}
