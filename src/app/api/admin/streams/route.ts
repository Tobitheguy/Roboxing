import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { adminAudit, events, streams } from "@/db/schema";
import { getSession, requireAdmin } from "@/lib/auth";
import { createLiveInput, getLiveInput, isStreamConfigured } from "@/lib/stream";

const BodySchema = z.object({
  eventId: z.number().int().positive(),
});

/**
 * Create (or re-read) the Cloudflare live input for an event.
 *
 * Returns the RTMP URL and stream key to the admin console so whoever is
 * broadcasting can paste them into OBS. The KEY IS NEVER STORED: only a
 * reference to the input is persisted, and the key is fetched from Cloudflare
 * on demand. Writing a live broadcast credential into the database would put
 * it in every backup of that database too.
 */
export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await getSession();

  if (!isStreamConfigured()) {
    return Response.json(
      { error: "Cloudflare Stream is not configured on this deployment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Expected { eventId: number }" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { eventId } = parsed.data;

  const eventRows = await db
    .select({ id: events.id, name: events.name, slug: events.slug })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const event = eventRows[0];
  if (!event) {
    return Response.json(
      { error: "Event not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const existingRows = await db
    .select()
    .from(streams)
    .where(eq(streams.eventId, eventId))
    .limit(1);
  const existing = existingRows[0];

  try {
    // Idempotent: re-reading an existing input rather than creating a second
    // one. An admin clicking twice on event day must not end up with two
    // inputs and no way to tell which the broadcaster is pointed at.
    const input = existing?.cfLiveInputId
      ? await getLiveInput(existing.cfLiveInputId)
      : await createLiveInput({
          name: `${event.name} (${event.slug})`,
          requireSignedURLs: true,
        });

    if (!existing) {
      await db.insert(streams).values({
        eventId,
        cfLiveInputId: input.uid,
        cfRtmpUrl: input.rtmps.url,
        // A reference, not the credential: the uid is what lets us ask
        // Cloudflare for the key again when the console needs to show it.
        cfStreamKeyRef: input.uid,
        status: "idle",
      });
    }

    await db.insert(adminAudit).values({
      adminEmail: session?.email ?? "unknown",
      action: existing ? "stream.read" : "stream.create",
      entity: "event",
      entityId: String(eventId),
      payloadJson: { liveInputId: input.uid },
    });

    return Response.json(
      {
        liveInputId: input.uid,
        rtmpUrl: input.rtmps.url,
        // Shown once in the console. Not persisted anywhere.
        streamKey: input.rtmps.streamKey,
        reused: Boolean(existing),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin/streams] failed:", error);
    return Response.json(
      { error: "Could not reach Cloudflare Stream." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
