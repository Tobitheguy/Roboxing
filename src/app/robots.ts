import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/app-url";

/**
 * Nothing here is indexable, so say so.
 *
 * Every route now requires an account, which means a crawler sees a redirect
 * to a sign-in page and nothing else. Letting it discover that by walking the
 * whole site wastes its crawl budget and fills the Search Console report with
 * "Page with redirect" for pages that are working exactly as intended.
 *
 * This file is a direct consequence of closing the site. If public pages come
 * back — a schedule, standings, team profiles — this should shrink to allow
 * them, because those are the pages that would bring anyone here in the first
 * place.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
    host: getAppUrl(),
  };
}
