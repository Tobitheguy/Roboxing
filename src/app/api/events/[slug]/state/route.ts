import { eq } from "drizzle-orm";

import { db } from "@/db";
import { boutResults, bouts, events } from "@/db/schema";
import { requireViewer } from "@/lib/auth";

/**
 * Live state for one event: which bout is running, and what has been decided.
 *
 * The watch page polls this every 10 seconds during a broadcast so the fight
 * card updates without reloading — reloading would restart the video, which is
 * the one thing a viewer will not forgive.
 *
 * CACHING IS NOT AN OPTIMISATION HERE. Five thousand viewers polling every ten
 * seconds is thirty thousand requests a minute. Sent straight to Postgres that
 * is a self-inflicted outage during the exact event it is meant to serve. The
 * five-second CDN cache collapses it to roughly twelve queries a minute no
 * matter how large the audience gets, and costs at most five seconds of delay
 * on a result appearing — invisible next to stream latency.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/events/[slug]/state">,
) {
  // Sign-in is already enforced by the proxy, before the CDN is consulted.
  // This adds the second factor — but only on a cache MISS, because a hit
  // never reaches this handler. Said plainly rather than implied: the check
  // is real for origin traffic and absent for the five-second cache window.
  // What leaks in that window is which bout is currently running, to someone
  // who already holds a valid session. That is the correct trade against
  // turning thirty thousand polls a minute into thirty thousand queries.
  const gate = await requireViewer();
  if (gate instanceof Response) return gate;

  const { slug } = await ctx.params;

  const eventRows = await db
    .select({ id: events.id, status: events.status, slug: events.slug })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);

  const event = eventRows[0];
  if (!event) {
    return Response.json(
      { error: "Event not found" },
      {
        status: 404,
        // Cached briefly on purpose. The CDN key is the slug, so an attacker
        // generating arbitrary slugs would otherwise reach Postgres on every
        // single request — caching the miss puts a ceiling on that.
        headers: { "Cache-Control": "public, s-maxage=60" },
      },
    );
  }

  const rows = await db
    .select({
      id: bouts.id,
      orderIndex: bouts.orderIndex,
      status: bouts.status,
      winnerRobotId: boutResults.winnerRobotId,
      method: boutResults.method,
      endRound: boutResults.endRound,
      endTimeSeconds: boutResults.endTimeSeconds,
      knockdownsA: boutResults.knockdownsA,
      knockdownsB: boutResults.knockdownsB,
    })
    .from(bouts)
    .leftJoin(boutResults, eq(boutResults.boutId, bouts.id))
    .where(eq(bouts.eventId, event.id))
    .orderBy(bouts.orderIndex);

  // An event that has not started cannot have public results. If any exist —
  // test data, an early entry, a mis-click — they are withheld rather than
  // published ahead of the broadcast. This endpoint is public and directly
  // curlable, so gating it in the client would gate nothing.
  const withholdResults = event.status === "scheduled";

  const body = {
    eventSlug: event.slug,
    eventStatus: event.status,
    currentBoutId: rows.find((b) => b.status === "live")?.id ?? null,
    bouts: rows.map((b) => ({
      id: b.id,
      orderIndex: b.orderIndex,
      status: b.status,
      result:
        !withholdResults && b.method != null
          ? {
              winnerRobotId: b.winnerRobotId,
              method: b.method,
              endRound: b.endRound,
              endTimeSeconds: b.endTimeSeconds,
              knockdownsA: b.knockdownsA ?? 0,
              knockdownsB: b.knockdownsB ?? 0,
            }
          : null,
    })),
  };

  return Response.json(body, {
    headers: {
      // s-maxage bounds how stale a viewer's card can be; SWR means the CDN
      // serves the previous value instantly while it refreshes behind the
      // scenes, so no viewer ever waits on the database.
      "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
    },
  });
}
