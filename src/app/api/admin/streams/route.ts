import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { adminAudit, events, streams } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  createLiveInput,
  deleteLiveInput,
  getLiveInput,
  isInputLive,
  isStreamConfigured,
} from "@/lib/stream";

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
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

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
      adminEmail: auth.email,
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

/**
 * Replace an event's live input, invalidating the old stream key.
 *
 * A Cloudflare stream key cannot be rotated — it is bound to the input for its
 * lifetime. So "the key leaked" and "delete the input" are the same operation,
 * and this is the only way to make a compromised key stop working.
 *
 * DELETE rather than another POST because it destroys something: the old input
 * goes, and any recording attached to it goes with it. That is stated in the
 * console before the button does anything.
 *
 * It creates the replacement in the same request. Leaving an event with no
 * input after an urgent delete is the state most likely to be reached at the
 * worst moment — during a broadcast, by someone who just realised the key was
 * public — and asking them to click a second button then is a poor bargain.
 *
 * If the delete succeeds and the create fails, the row is removed anyway. A
 * row pointing at an input that no longer exists is worse than no row: every
 * later call would try to read it and fail, with nothing in the UI explaining
 * why.
 */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

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

  const existing = (
    await db.select().from(streams).where(eq(streams.eventId, eventId)).limit(1)
  )[0];

  try {
    if (existing?.cfLiveInputId) {
      // A 404 from Cloudflare is success for our purposes: the input we wanted
      // gone is gone. Anything else is a real failure and must not be swallowed,
      // because "the old key still works" is the one outcome that matters here.
      try {
        await deleteLiveInput(existing.cfLiveInputId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/404|not.?found/i.test(message)) throw error;
      }
    }

    if (existing) {
      await db.delete(streams).where(eq(streams.id, existing.id));
    }

    const input = await createLiveInput({
      name: `${event.name} (${event.slug})`,
      requireSignedURLs: true,
    });

    await db.insert(streams).values({
      eventId,
      cfLiveInputId: input.uid,
      cfRtmpUrl: input.rtmps.url,
      cfStreamKeyRef: input.uid,
      status: "idle",
    });

    await db.insert(adminAudit).values({
      adminEmail: auth.email,
      action: "stream.rotate",
      entity: "event",
      entityId: String(eventId),
      payloadJson: {
        removed: existing?.cfLiveInputId ?? null,
        created: input.uid,
      },
    });

    return Response.json(
      {
        liveInputId: input.uid,
        rtmpUrl: input.rtmps.url,
        streamKey: input.rtmps.streamKey,
        replaced: existing?.cfLiveInputId ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin/streams] rotate failed:", error);
    return Response.json(
      {
        error:
          "Could not replace the live input. The old key may still be valid — " +
          "check Cloudflare Stream before broadcasting.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/**
 * Is Cloudflare actually receiving a signal for this event right now?
 *
 * Without this the console can hand out RTMP credentials and then say nothing
 * at all about whether they worked. A black player is then two failures
 * wearing the same face: the broadcaster never connected, or the connection is
 * fine and playback is broken. Those need opposite fixes, and guessing between
 * them on event day is the worst possible time.
 *
 * Polled by the console, so it is deliberately cheap: one Cloudflare call, no
 * database write, and it never changes state.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const eventId = Number(new URL(request.url).searchParams.get("eventId"));
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return Response.json(
      { error: "Expected ?eventId=" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const existing = (
    await db.select().from(streams).where(eq(streams.eventId, eventId)).limit(1)
  )[0];

  if (!existing?.cfLiveInputId) {
    return Response.json(
      { configured: false, receiving: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isStreamConfigured()) {
    return Response.json(
      { configured: false, receiving: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const receiving = await isInputLive(existing.cfLiveInputId);
    return Response.json(
      { configured: true, receiving },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin/streams] status check failed:", error);
    // `unknown` rather than `false`. Reporting "not receiving" when we simply
    // could not ask would send someone to debug OBS while it was working.
    return Response.json(
      { configured: true, receiving: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
