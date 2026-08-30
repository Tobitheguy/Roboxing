import "server-only";

/**
 * Cloudflare Stream Live client.
 *
 * Thin on purpose. Cloudflare handles RTMP ingest, the transcode ladder, and
 * global HLS delivery; everything a viewer sees is still the Roboxing player
 * on a Roboxing domain. What this file owns is the small surface Roboxing
 * actually needs: create an input, read its status, find the recording, and
 * mint short-lived signed playback tokens.
 *
 * Nothing here is called at module load, so a missing token is a clear runtime
 * error on the one admin action that needs it rather than a build failure.
 */

const API_BASE = "https://api.cloudflare.com/client/v4";

function config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const customerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;

  if (!accountId || !apiToken) {
    throw new Error(
      "Cloudflare Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID and " +
        "CLOUDFLARE_API_TOKEN — see the README.",
    );
  }
  return { accountId, apiToken, customerCode };
}

type CloudflareEnvelope<T> = {
  success: boolean;
  errors: { code: number; message: string }[];
  messages: unknown[];
  result: T;
};

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { accountId, apiToken } = config();

  const response = await fetch(`${API_BASE}/accounts/${accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    // Never cache an API call about live broadcast state.
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | CloudflareEnvelope<T>
    | null;

  if (!response.ok || !body?.success) {
    const detail =
      body?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") ??
      `HTTP ${response.status}`;
    // Deliberately does not include the request body — it can contain a
    // stream key, and this message ends up in logs.
    throw new Error(`Cloudflare Stream request failed (${path}): ${detail}`);
  }

  return body.result;
}

/* -------------------------------------------------------------------------- */
/* Live inputs                                                                 */
/* -------------------------------------------------------------------------- */

export type LiveInput = {
  uid: string;
  rtmps: { url: string; streamKey: string };
  srt?: { url: string; streamId: string; passphrase: string };
  status: { current?: { state?: string } } | null;
  meta?: Record<string, unknown>;
  created: string;
};

export type CreateLiveInputOptions = {
  /** Shown in the Cloudflare dashboard so inputs are identifiable. */
  name: string;
  /**
   * Require a signed token to play. On by default: without it the HLS manifest
   * is a copy-pasteable public link, which for licensed content is not a
   * detail — it is the whole rights agreement.
   */
  requireSignedURLs?: boolean;
};

export async function createLiveInput(
  options: CreateLiveInputOptions,
): Promise<LiveInput> {
  return cf<LiveInput>("/stream/live_inputs", {
    method: "POST",
    body: JSON.stringify({
      meta: { name: options.name },
      recording: {
        // Cloudflare produces a recording automatically when the broadcast
        // ends, which is what lets /watch/[slug] serve the same URL afterward.
        mode: "automatic",
        requireSignedURLs: options.requireSignedURLs ?? true,
        // Keep recordings indefinitely; deletion is a rights decision, not a
        // default.
        timeoutSeconds: 0,
      },
    }),
  });
}

export async function getLiveInput(uid: string): Promise<LiveInput> {
  return cf<LiveInput>(`/stream/live_inputs/${uid}`);
}

/** Whether anything is currently being pushed to this input. */
export async function isInputLive(uid: string): Promise<boolean> {
  const input = await getLiveInput(uid);
  return input.status?.current?.state === "connected";
}

export type StreamVideo = {
  uid: string;
  status: { state: string };
  duration: number;
  created: string;
  readyToStream: boolean;
};

/**
 * Recordings produced by a live input, newest first.
 *
 * Used after a broadcast ends so the same /watch URL serves the replay.
 */
export async function listRecordings(uid: string): Promise<StreamVideo[]> {
  const videos = await cf<StreamVideo[]>(`/stream/live_inputs/${uid}/videos`);
  return [...videos].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  );
}

/* -------------------------------------------------------------------------- */
/* Signed playback                                                             */
/* -------------------------------------------------------------------------- */

export type SignedTokenOptions = {
  /** Seconds the token stays valid. Short by design — see the note below. */
  ttlSeconds?: number;
  /**
   * ISO 3166-1 alpha-2 codes permitted to play. Null means unrestricted.
   *
   * This is contractual rather than cosmetic: broadcast rights are almost
   * always territory-limited, so the list comes from the agreement and is
   * stored on the event.
   */
  allowedCountries?: string[] | null;
};

/**
 * Mint a short-lived signed playback token.
 *
 * Deliberately short-lived, which is exactly why the player must be able to
 * ask for a new one: a two-hour broadcast outlives any sensible token TTL, so
 * without renewal a viewer's stream dies partway through the main event. The
 * player refreshes on a fatal network error; this is the endpoint behind that.
 */
export async function createSignedToken(
  videoOrInputUid: string,
  options: SignedTokenOptions = {},
): Promise<string> {
  const ttl = options.ttlSeconds ?? 60 * 60; // one hour

  const accessRules = options.allowedCountries?.length
    ? [
        {
          type: "ip.geoip.country",
          country: options.allowedCountries.map((c) => c.toUpperCase()),
          action: "allow",
        },
        // Anything not explicitly allowed is blocked. The order matters —
        // Cloudflare evaluates rules top to bottom and takes the first match.
        { type: "any", action: "block" },
      ]
    : undefined;

  const result = await cf<{ token: string }>(
    `/stream/${videoOrInputUid}/token`,
    {
      method: "POST",
      body: JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + ttl,
        ...(accessRules ? { accessRules } : {}),
      }),
    },
  );

  return result.token;
}

/* -------------------------------------------------------------------------- */
/* Playback URLs                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The HLS manifest URL.
 *
 * Pass a signed token in place of the uid when the input requires signed URLs
 * — Cloudflare accepts the token in the same path position.
 */
export function hlsUrl(uidOrToken: string): string {
  const { customerCode } = config();
  if (!customerCode) {
    throw new Error(
      "CLOUDFLARE_STREAM_CUSTOMER_CODE is not set — it is the customer-XXXX " +
        "segment of any Stream playback URL.",
    );
  }
  return `https://customer-${customerCode}.cloudflarestream.com/${uidOrToken}/manifest/video.m3u8`;
}

/** Whether Cloudflare credentials are present, without throwing. */
export function isStreamConfigured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_API_TOKEN &&
      process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE,
  );
}
