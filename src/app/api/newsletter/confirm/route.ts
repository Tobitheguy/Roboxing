import { eq } from "drizzle-orm";

import { db } from "@/db";
import { subscribers } from "@/db/schema";

/**
 * The second half of double opt-in.
 *
 * Reached by clicking a link in a mail, so there is no session and there never
 * will be one — the token IS the authentication. It is a random UUID stored on
 * the row, unguessable and distinct from the unsubscribe token, so possessing
 * one does not grant the other.
 *
 * Public by design: `proxy.ts` is a blocklist and this path is deliberately
 * not on it. A confirmation link that demanded a login would be unusable.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const done = new URL("/newsletter/confirmed", request.url);

  if (!token) {
    done.searchParams.set("ok", "0");
    return Response.redirect(done, 303);
  }

  const rows = await db
    .select({
      id: subscribers.id,
      confirmedAt: subscribers.confirmedAt,
    })
    .from(subscribers)
    .where(eq(subscribers.confirmToken, token))
    .limit(1);

  const subscriber = rows[0];
  if (!subscriber) {
    done.searchParams.set("ok", "0");
    return Response.redirect(done, 303);
  }

  /*
   * Only stamp an unconfirmed row. Clicking the link a second time — from a
   * forwarded mail, a prefetching client, a browser restoring tabs — must not
   * move the timestamp, because `confirmed_at` is the record of WHEN consent
   * was given and that is the thing you would have to produce if it were ever
   * questioned. A repeat click is still a success to the person clicking.
   */
  if (!subscriber.confirmedAt) {
    await db
      .update(subscribers)
      .set({ confirmedAt: new Date(), unsubscribedAt: null })
      .where(eq(subscribers.id, subscriber.id));
  }

  return Response.redirect(done, 303);
}
