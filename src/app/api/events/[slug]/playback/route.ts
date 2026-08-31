import { eq } from "drizzle-orm";

import { db } from "@/db";
import { events, streams } from "@/db/schema";
import { checkEventAccess } from "@/lib/access";
import { requireViewer } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  createSignedToken,
  hlsUrl,
  isStreamConfigured,
} from "@/lib/stream";

/**
 * Mint a fresh signed playback URL for an event.
 *
 * Three separate things decide whether a URL comes back, and they are not
 * interchangeable:
 *
 *   1. An ACCOUNT, with a second factor — every route on the site needs one.
 *   2. An ENTITLEMENT, for events that are not free. That is the paywall.
 *   3. The SIGNED TOKEN itself, which gates neither of those. It gates how
 *      long a manifest URL stays valid and which territories it plays in —
 *      broadcast rights are almost always territory-limited, so geo-blocking
 *      is a contractual obligation rather than a feature.
 *
 * The player calls this on a fatal network error. Tokens are short-lived and a
 * two-hour broadcast outlives any sensible TTL, so without this endpoint a
 * viewer's stream dies partway through the main event.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/events/[slug]/playback">,
) {
  const { slug } = await ctx.params;

  // The proxy has already turned away anyone without a session. This adds the
  // second factor, which the proxy cannot check without a network call on
  // every request to the whole site.
  //
  // Caveat, stated rather than glossed over: a FREE event's response is shared
  // in the CDN for 30 seconds, so a cache hit is served without reaching this
  // line. The gap is bounded to free content, to callers who already hold a
  // valid session, and to 30 seconds. Paid events are `no-store` and cannot be
  // served from a shared cache at all, which is where it would actually cost
  // something.
  const gate = await requireViewer();
  if (gate instanceof Response) return gate;

  // A player stuck in a retry loop must not be able to hammer Cloudflare's
  // token API on our account. The player has its own backoff and retry cap;
  // this is the backstop for the client that ignores both.
  const limit = rateLimit(`playback:${clientIp(request)}`, 30, 60);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  const rows = await db
    .select({
      id: events.id,
      status: events.status,
      access: events.access,
      startsAt: events.startsAt,
      allowedCountries: events.allowedCountries,
      liveInputId: streams.cfLiveInputId,
      recordingUid: streams.cfRecordingUid,
      directHlsUrl: streams.cfPlaybackHlsUrl,
    })
    .from(events)
    .leftJoin(streams, eq(streams.eventId, events.id))
    .where(eq(events.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return Response.json(
      { error: "Event not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  // THE PAYWALL. Checked here, not only on the page — this endpoint returns a
  // working manifest URL, so a check that lives only in the UI protects
  // nothing from anyone who opens the network tab once.
  const decision = await checkEventAccess({ id: row.id, access: row.access });

  if (!decision.allowed) {
    return Response.json(
      { error: "Access denied", reason: decision.reason },
      {
        // 401 when signing in might fix it, 403 when it will not. Different
        // problems, different buttons in the UI.
        status: decision.reason === "sign_in_required" ? 401 : 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  // A directly-supplied manifest is not a Cloudflare asset and needs no token.
  //
  // IT ALSO CANNOT BE GEO-RESTRICTED. Territory limits are enforced by the
  // signed-token access rules, which only exist for Cloudflare-hosted streams.
  // If an event carries a territory restriction, refuse rather than quietly
  // serving it worldwide — a rights breach nobody notices is worse than a
  // broken player somebody reports.
  if (row.directHlsUrl && row.allowedCountries?.length) {
    console.error(
      `[playback] event ${slug} has a direct HLS URL and a territory ` +
        `restriction; a direct URL cannot enforce one. Refusing.`,
    );
    return Response.json(
      { error: "This event cannot be played in your region." },
      { status: 451, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (row.directHlsUrl) {
    return Response.json(
      { url: row.directHlsUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isStreamConfigured()) {
    return Response.json(
      { error: "Streaming is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // A completed event plays its recording; a live one plays the input. Both
  // live at the same public URL, which is the point.
  const uid =
    row.status === "completed" && row.recordingUid
      ? row.recordingUid
      : row.liveInputId;

  if (!uid) {
    return Response.json(
      { error: "No stream available for this event" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const token = await createSignedToken(uid, {
      allowedCountries: row.allowedCountries,
      // Comfortably longer than the poll interval, comfortably shorter than a
      // broadcast — the player renews rather than holding one long-lived key.
      ttlSeconds: 60 * 60,
    });

    return Response.json(
      { url: hlsUrl(token) },
      {
        headers: {
          // Cacheable at the CDN, deliberately. A signed token is not
          // per-viewer: its expiry is absolute and Cloudflare evaluates the
          // geo rules against the watching IP at playback time, so one token
          // is safely shared for a short window. Without this, every viewer
          // arriving at once is a separate call to Cloudflare's API — and
          // exhausting that limit breaks playback for everybody at the same
          // moment, during the event.
          //
          // max-age=0 keeps browsers from holding a token past its usefulness
          // while still letting the shared cache absorb the fan-out.
          //
          // 30s rather than minutes: flipping an event from free to paid takes
          // effect on the next request, not after a cached free response has
          // finished handing out working manifests. Still absorbs the burst
          // when a few thousand viewers arrive at once, which is the point.
          //
          // ONLY for free events. Once an event is paid, a shared cache entry
          // would hand the first subscriber's manifest URL to every subsequent
          // caller — including ones the paywall just refused. Correctness
          // before fan-out.
          "Cache-Control":
            row.access === "free"
              ? "public, max-age=0, s-maxage=30"
              : "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("[playback] could not mint signed URL:", error);
    return Response.json(
      { error: "Could not create a playback URL" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
