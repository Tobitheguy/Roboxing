/**
 * What may be uploaded, and under what name.
 *
 * Pure — no AWS client, no environment, no randomness beyond what is passed
 * in. That is deliberate: these are the rules that decide whether a stranger
 * can put a file in our bucket, and they need to be readable and testable
 * without standing up an S3 client.
 */

/** Where uploaded images live in the bucket. */
export const UPLOAD_PREFIX = "images";

/**
 * 8 MB. Comfortably more than a team crest or a robot photo needs, and small
 * enough that a mistake costs pennies rather than a bill. Enforced by the
 * SIGNATURE, not by a check the browser could skip — the presigned request
 * commits to a content length, so a different size is rejected by R2 itself.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Formats allowed, mapped to the extension the object gets.
 *
 * SVG is deliberately absent. An SVG is a document, not an image: it can carry
 * script, and the bucket serves it from a domain we do not control the CSP of.
 * Nothing on this site needs vector logos badly enough to accept that.
 *
 * The extension comes from THIS table rather than from the uploaded filename,
 * so a file called `crest.png.html` cannot become an HTML document in the
 * bucket.
 */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export type UploadRequest = {
  contentType: string;
  sizeBytes: number;
};

export type UploadRejection =
  | "unsupported_type"
  | "too_large"
  | "empty"
  | "invalid_size";

export function validateUpload(
  request: UploadRequest,
): { ok: true } | { ok: false; reason: UploadRejection } {
  if (!ALLOWED_IMAGE_TYPES[request.contentType]) {
    return { ok: false, reason: "unsupported_type" };
  }
  if (!Number.isFinite(request.sizeBytes) || request.sizeBytes < 0) {
    return { ok: false, reason: "invalid_size" };
  }
  if (request.sizeBytes === 0) return { ok: false, reason: "empty" };
  if (request.sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  return { ok: true };
}

export function rejectionMessage(reason: UploadRejection): string {
  switch (reason) {
    case "unsupported_type":
      return `That file type is not supported. Use ${Object.values(
        ALLOWED_IMAGE_TYPES,
      )
        .map((e) => e.toUpperCase())
        .join(", ")}.`;
    case "too_large":
      return `That file is too large. The limit is ${Math.round(
        MAX_UPLOAD_BYTES / (1024 * 1024),
      )} MB.`;
    case "empty":
      return "That file is empty.";
    case "invalid_size":
      return "That file could not be read.";
  }
}

/**
 * The object key, built entirely from values WE control.
 *
 * The client's filename is never part of it. A filename is attacker-supplied
 * text: it can contain `../`, a null byte, a second extension, a name that
 * collides with an existing object, or several hundred characters of unicode.
 * Deriving the whole key from a random id and a table lookup removes every one
 * of those questions rather than answering them one at a time.
 *
 * `id` is passed in rather than generated here so the function stays pure and
 * a test can pin the exact output.
 */
export function buildObjectKey(contentType: string, id: string): string {
  const extension = ALLOWED_IMAGE_TYPES[contentType];
  if (!extension) {
    throw new Error(`buildObjectKey called with unsupported type ${contentType}`);
  }
  return `${UPLOAD_PREFIX}/${id}.${extension}`;
}

/**
 * The public URL an object will have once uploaded.
 *
 * Joined carefully: R2_PUBLIC_URL is written by a human into an environment
 * variable and will sometimes have a trailing slash and sometimes not.
 */
export function publicUrlFor(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${key}`;
}
