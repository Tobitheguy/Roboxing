import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { isR2Configured, presignImageUpload } from "@/lib/r2";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rejectionMessage, validateUpload } from "@/lib/uploads";

/**
 * Hand an administrator a one-shot URL for putting one image into R2.
 *
 * This route decides three things and signs all of them, so none of them can
 * be renegotiated by the browser afterwards: WHERE the object goes, WHAT type
 * it claims to be, and HOW BIG it may be. The uploaded filename is never used
 * — the key is a fresh uuid plus an extension looked up from the content type.
 *
 * Rate limited even though it is admin-only. The limit is not there to stop an
 * administrator; it is there so a stuck client retrying in a loop cannot mint
 * hundreds of signed URLs against the bucket.
 */

const Body = z.object({
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const limit = rateLimit(`upload:${clientIp(request)}`, 60, 60);
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

  if (!isR2Configured()) {
    return Response.json(
      {
        error:
          "Image upload is not configured. R2_ACCESS_KEY_ID and " +
          "R2_SECRET_ACCESS_KEY are missing.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return Response.json(
      { error: "Expected a JSON body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!parsed.success) {
    return Response.json(
      { error: "contentType and sizeBytes are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const verdict = validateUpload(parsed.data);
  if (!verdict.ok) {
    return Response.json(
      { error: rejectionMessage(verdict.reason), reason: verdict.reason },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const presigned = await presignImageUpload({
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
      id: crypto.randomUUID(),
    });

    if (!presigned) {
      return Response.json(
        { error: "Image upload is not configured." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(presigned, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[uploads] could not presign:", error);
    return Response.json(
      { error: "Could not prepare the upload." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
