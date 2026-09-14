import { twitchLogin } from "@/lib/twitch";

/**
 * Does the Twitch credential actually work?
 *
 * WHY THIS HAD TO EXIST BEFORE THE ANSWER WAS KNOWABLE.
 *
 * `getLiveChannels()` is written to never throw: no credentials, a Twitch
 * outage, a malformed response — every path returns an empty list, because it
 * renders inside the root shell and an exception there would 500 every page on
 * the site. That is the right behaviour and it has one cost: a wrong secret
 * and a quiet Tuesday look identical from the outside. Tobias entered his
 * credentials and there was no way to tell whether they took.
 *
 * So this probe does the opposite of the renderer: it reports exactly which
 * step failed and nothing about it is cached.
 *
 * IT NEVER RETURNS THE SECRET, OR ANY PART OF IT. The check is present /
 * authenticates / answers — three booleans and a message. The client id is
 * public by design and is echoed back truncated purely so an operator can see
 * they pasted the one they meant to.
 */

export type TwitchHealth = {
  /** Both variables are set in this environment. */
  configured: boolean;
  /** The client-credentials grant returned an app token. */
  authenticates: boolean;
  /** Helix answered a real query with that token. */
  queryable: boolean;
  /** How many channels from `watch_channels` are broadcasting right now. */
  liveNow: number | null;
  /** First eight characters of the client id, so a typo is visible. */
  clientIdHint: string | null;
  /** What went wrong, in the operator's terms. Null when everything passed. */
  problem: string | null;
};

export async function checkTwitch(
  channelUrls: (string | null)[],
): Promise<TwitchHealth> {
  const id = process.env.TWITCH_CLIENT_ID?.trim();
  const secret = process.env.TWITCH_CLIENT_SECRET?.trim();

  const base: TwitchHealth = {
    configured: false,
    authenticates: false,
    queryable: false,
    liveNow: null,
    clientIdHint: id ? `${id.slice(0, 8)}…` : null,
    problem: null,
  };

  if (!id && !secret) {
    return {
      ...base,
      problem:
        "Neither TWITCH_CLIENT_ID nor TWITCH_CLIENT_SECRET is set in this environment. The embedded players still work without them — only the live badge is missing.",
    };
  }
  if (!id) return { ...base, problem: "TWITCH_CLIENT_SECRET is set but TWITCH_CLIENT_ID is not." };
  if (!secret) {
    return {
      ...base,
      configured: false,
      problem:
        "TWITCH_CLIENT_ID is set but TWITCH_CLIENT_SECRET is not. Generate one in dev.twitch.tv under your application, then add it in Vercel AND redeploy — Vercel bakes env vars in at build time.",
    };
  }

  const configured = { ...base, configured: true };

  /* No `next: { revalidate }` anywhere in here. The renderer caches its token
     for an hour, which is correct for it and useless for a probe — a cached
     pass would keep reporting success after a secret was rotated away. */
  let token: string;
  try {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}&grant_type=client_credentials`,
      { method: "POST", cache: "no-store" },
    );
    if (!res.ok) {
      /* Twitch is specific here and the distinction matters: 403 means the
         pair is wrong, 400 usually means the grant type or a missing field. */
      const detail =
        res.status === 403
          ? "Twitch rejected the id/secret pair (403). Either the secret is wrong, or it was regenerated in the console and the old one is in Vercel."
          : `Twitch returned ${res.status} from the token endpoint.`;
      return { ...configured, problem: detail };
    }
    const body = (await res.json()) as { access_token?: string };
    if (!body.access_token) {
      return { ...configured, problem: "Twitch accepted the request but returned no access token." };
    }
    token = body.access_token;
  } catch (error) {
    return {
      ...configured,
      problem: `Could not reach id.twitch.tv: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  const authenticates = { ...configured, authenticates: true };

  /* A real query against our own channel list, not a synthetic one. A token
     that authenticates but cannot query is a scope or app-type problem, and
     asking about a channel we do not track would not surface it. */
  const logins = [...new Set(channelUrls.map(twitchLogin).filter(Boolean))] as string[];
  if (logins.length === 0) {
    return {
      ...authenticates,
      queryable: true,
      liveNow: 0,
      problem:
        "The credential works, but no twitch.tv channel is in the broadcast directory, so there is nothing to poll.",
    };
  }

  try {
    const query = logins.map((l) => `user_login=${encodeURIComponent(l)}`).join("&");
    const res = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
      headers: { "Client-Id": id, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ...authenticates, problem: `Helix returned ${res.status} for /streams.` };
    }
    const body = (await res.json()) as { data?: { type?: string }[] };
    const live = (body.data ?? []).filter((s) => s.type === "live").length;
    return { ...authenticates, queryable: true, liveNow: live, problem: null };
  } catch (error) {
    return {
      ...authenticates,
      problem: `Could not reach api.twitch.tv: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
