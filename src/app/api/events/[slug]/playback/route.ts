import { eq } from "drizzle-orm";

import { db } from "@/db";
import { events, streams } from "@/db/schema";
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
  _request: Request,
  ctx: RouteContext<"/api/events/[slug]/playback">,
) {
  const { slug } = await ctx.params;

  const rows = await db
    .select({
      status: events.status,
      allowedCountries: events.allowedCountries,
      liveInputId: streams.cfLiveInputId,
      recordingUid: streams.cfRecordingUid,
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
          // Never cached, at any layer: a signed token is per-request and
          // handing a cached one to a later viewer would extend its life
          // beyond what was minted for it.
          "Cache-Control": "no-store",
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
