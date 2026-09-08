import { connection } from "next/server";

import { isDemoData } from "@/lib/demo-data";

/**
 * Site-wide notice that the data on screen is invented.
 *
 * This is a safety feature, not decoration. The site is publicly reachable and
 * there is no signed broadcast rights deal, so every team, robot, and result
 * currently rendered is fictional. Anyone landing on a standings table has no
 * way to tell that from the table itself — a league table looks exactly as
 * authoritative whether or not the fights happened.
 *
 * It disappears on its own: the banner is driven by the presence of the demo
 * competition, so it vanishes the moment real licensed data replaces it rather
 * than depending on someone remembering to delete a flag.
 */
export async function DemoBanner() {
  // Request-time, not build-time. Without this Next prerenders the banner into
  // static HTML, and the notice would keep asserting the data is fake for as
  // long as that deployment is served after real data replaces it.
  await connection();

  // The query, its try/catch and its fail-closed behaviour all live in
  // `isDemoData()` now, because robots.txt has to reach the same verdict and
  // two implementations of "is this data real yet" would eventually disagree
  // — with the banner saying one thing on the page and the crawler being told
  // another.
  //
  // Note that it fails CLOSED: a database error shows the notice rather than
  // hiding it. Wrongly warning that real data is fake is embarrassing;
  // silently dropping the warning from a page of invented results is not
  // recoverable.
  if (!(await isDemoData())) return null;

  return (
    <div className="border-drift/30 bg-drift/10 border-b">
      <p className="text-drift mx-auto max-w-7xl px-4 py-2 text-center text-xs md:px-6">
        <span className="font-display font-semibold tracking-wide uppercase">
          Demo data
        </span>{" "}
        — every team, robot, and result on this site is invented. No fights
        described here took place.
      </p>
    </div>
  );
}
