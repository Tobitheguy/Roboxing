import { connection } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { competitions } from "@/db/schema";

/** Kept in sync with src/db/seed.ts. */
const DEMO_COMPETITION_SLUG = "exhibition-season-1";

/**
 * Site-wide notice that the data on screen is invented.
 *
 * This is a safety feature, not decoration. The site is publicly reachable and
 * there is no signed broadcast rights deal, so every team, robot, and result
 * currently rendered is fictional. Anyone who lands on a standings table has
 * no way to know that from the table itself — a league table looks exactly as
 * authoritative whether or not the fights happened.
 *
 * It disappears on its own: the banner is driven by the presence of the demo
 * competition, so it vanishes the moment real licensed data replaces it rather
 * than depending on someone remembering to delete a flag.
 */
export async function DemoBanner() {
  // Request-time, not build-time. Without this Next prerenders the banner into
  // static HTML, and the notice would keep claiming the data is fake for as
  // long as the old deployment is cached after real data replaces it.
  await connection();

  const rows = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(eq(competitions.slug, DEMO_COMPETITION_SLUG))
    .limit(1);

  if (rows.length === 0) return null;

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
