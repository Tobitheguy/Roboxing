import { eq } from "drizzle-orm";

import { db } from "@/db";
import { events, streams } from "@/db/schema";
import { checkEventAccess } from "@/lib/access";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  createSignedToken,
  hlsUrl,
  isStreamConfigured,
} from "@/lib/stream";

/**
 * Mint a fresh signed playback URL for an event.
 *
 * Public by design, and that is not a hole: signed tokens do not gate WHO may
 * watch — the watch page itself is public — they gate how long a manifest URL
 * stays valid and which territories it plays in. Both matter because broadcast
 * rights are almost always territory-limited, which makes geo-blocking a
 * contractual obligation rather than a feature.
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
  const decision = await checkEventAccess({
    id: row.id,
    access: row.access,
    startsAt: row.startsAt,
  });

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
          // ONLY for free events. Once an event is paid, a shared cache entry
          // would hand the first subscriber's manifest URL to every subsequent
          // caller — including ones the paywall just refused. Correctness
          // before fan-out.
          "Cache-Control":
            row.access === "free"
              ? "public, max-age=0, s-maxage=240, stale-while-revalidate=60"
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
