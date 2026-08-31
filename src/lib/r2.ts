import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { buildObjectKey, publicUrlFor } from "@/lib/uploads";

/**
 * Uploads go straight from the browser to R2.
 *
 * The alternative — POST the file to our own route and forward it — would put
 * every byte through a serverless function: slower, billed twice, and bounded
 * by the request body limit. A presigned URL means the file never touches us.
 *
 * What we still control, because it is signed into the URL: the object key,
 * the content type, and the exact byte count. R2 rejects a request that
 * differs from any of them, so these are constraints rather than requests.
 */

/** How long a signed upload URL stays valid. Long enough to pick a file and
 * send it, short enough that a leaked URL is not a standing write grant. */
const UPLOAD_URL_TTL_SECONDS = 5 * 60;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

function readConfig(): R2Config | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

/** Whether uploading is possible at all, without throwing. */
export function isR2Configured(): boolean {
  return readConfig() !== null;
}

let client: S3Client | null = null;

function r2(config: R2Config): S3Client {
  if (client) return client;
  client = new S3Client({
    // R2 is S3-compatible but has no regions. "auto" is what Cloudflare
    // documents; the SDK requires the field to be set to something.
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
}

export type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  /** Headers the browser MUST send, because they are part of the signature. */
  headers: Record<string, string>;
  expiresInSeconds: number;
};

/**
 * A one-shot URL for putting exactly this object.
 *
 * `id` is passed in rather than generated here so the caller owns randomness
 * and this stays easy to reason about; the route uses crypto.randomUUID().
 */
export async function presignImageUpload({
  contentType,
  sizeBytes,
  id,
}: {
  contentType: string;
  sizeBytes: number;
  id: string;
}): Promise<PresignedUpload | null> {
  const config = readConfig();
  if (!config) return null;

  const key = buildObjectKey(contentType, id);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
    // Signing the length is what makes the size limit real. Without it the
    // limit would be a number the browser was politely asked to respect.
    ContentLength: sizeBytes,
    // Bucket-level public access serves these; the object cache header keeps
    // a crest from being re-fetched on every page view. Images are immutable
    // in practice because the key is a fresh uuid on every upload.
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(r2(config), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });

  return {
    uploadUrl,
    publicUrl: publicUrlFor(config.publicUrl, key),
    key,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(sizeBytes),
    },
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  };
}
