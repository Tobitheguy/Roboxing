import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { DEMO_COMPETITION_SLUG } from "@/db/constants";
import { competitions } from "@/db/schema";
import { rethrowControlFlow } from "@/lib/next-errors";

/**
 * Is the site still showing invented data?
 *
 * Driven by the presence of the seeded demo competition, so it turns itself
 * off when real data replaces it rather than depending on someone remembering
 * to flip a flag. `DemoBanner` has used this rule since the beginning;
 * extracted here because `robots.ts` now needs the same answer and two copies
 * of "is this real yet" is one copy too many.
 *
 * Fails CLOSED — a database error answers "yes, still demo". Every caller uses
 * this to decide whether to expose something, and the safe direction when we
 * cannot tell is to assume the data is fake.
 */
export const isDemoData = cache(async (): Promise<boolean> => {
  try {
    const rows = await db
      .select({ id: competitions.id })
      .from(competitions)
      .where(eq(competitions.slug, DEMO_COMPETITION_SLUG))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    rethrowControlFlow(error);
    console.error("[demo-data] could not determine demo state:", error);
    return true;
  }
});
