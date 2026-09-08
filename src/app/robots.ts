import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/app-url";
import { isDemoData } from "@/lib/demo-data";

/**
 * What crawlers may read.
 *
 * Two states, and the site picks between them by itself.
 *
 * **While the database still holds the seeded demo data, nothing is
 * crawlable.** Every team, robot and result on the site is currently invented.
 * `DemoBanner` says so at the top of every page, and a search result snippet
 * does not carry the banner — so an indexed fake fight looks exactly as
 * authoritative as a real one, in the one place we cannot annotate. For a
 * project whose entire pitch is being the reliable record of this sport, that
 * is the worst possible first impression, and it is not one that can be taken
 * back: Google keeps a page for weeks after it changes.
 *
 * Once real data replaces the demo season the disallow lifts on its own, with
 * no deploy and nothing to remember. That self-healing property is the reason
 * this is driven by the data rather than by an environment variable — a flag
 * would be set once, forgotten, and eventually wrong in both directions.
 *
 * **Afterwards**, everything opens except the parts that are gated or are not
 * pages: `/admin` and `/account` would only ever yield a redirect, `/api`
 * returns JSON, and indexing Clerk's `/sign-in` form makes it compete with the
 * real pages for the site's own brand queries.
 */
/**
 * Regenerate hourly.
 *
 * Without this the file is prerendered at build time, which would freeze the
 * demo verdict into the deployment and defeat the entire self-healing point:
 * the demo season is deleted with a database command, not a deploy, so the
 * disallow would stay in place until someone happened to ship something else.
 *
 * An hour, not a request-time read. Serving this dynamically would put a
 * database query on a path crawlers hit constantly, and — because
 * `isDemoData()` fails closed — one transient Neon blip during Googlebot's
 * fetch would answer "disallow everything", which Google then caches for about
 * a day. ISR keeps the last good answer through a blip and still opens the
 * site within an hour of the data becoming real.
 */
export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const appUrl = getAppUrl();

  if (await isDemoData()) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: appUrl,
      // No sitemap while closed. Advertising a list of URLs that the same
      // file forbids is a contradiction, and Search Console reports it as one.
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/api/", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
