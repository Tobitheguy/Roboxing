import { db } from "@/db";
import { competitions, watchChannels } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Is anyone broadcasting right now?
 *
 * This is the only thing on the site that changes on a day when nothing was
 * scheduled — which is most days. A record of a sport that runs one event a
 * month looks identical on the morning after a fight and on a dead Tuesday,
 * and that sameness is the real reason somebody does not come back. A red
 * strip that says UFB is live IS the reason to open the page.
 *
 * WHERE THE CHANNEL LIST COMES FROM
 * ---------------------------------
 * Not a constant in this file — from `watch_channels`, every row whose URL is
 * a twitch.tv channel. The broadcast directory is already the place where "who
 * carries this league" is maintained, so adding a Twitch channel there lights
 * it up here with no code change. A hard-coded list would be a second place to
 * forget.
 *
 * CREDENTIALS
 * -----------
 * Twitch's Helix API needs a client id and secret (a free app at
 * dev.twitch.tv, two minutes). Without them this module returns an empty list
 * and says why — it never throws. A missing key must not take down a strip
 * that renders on every page of the site, and an unconfigured deployment
 * should look like "no channel is live", not like an error.
 *
 * There is no credential-free way to do this properly. Twitch's undocumented
 * GraphQL endpoints work until they do not, and pointing a cron at them is how
 * you get an IP banned rather than a feature.
 */

export type LiveChannel = {
  /** Twitch login, e.g. "ufb0ts". */
  login: string;
  /** The channel's name as we display it, from `watch_channels`. */
  name: string;
  url: string;
  competitionName: string;
  competitionSlug: string;
  /** The stream's own title, which is usually the card. */
  title: string;
  viewers: number;
  startedAt: string;
};

/**
 * Pull the Twitch logins out of the broadcast directory.
 *
 * Matches `twitch.tv/<login>` and nothing deeper — a link to a VOD or a clip
 * is not a channel and must not be polled as one.
 */
export function twitchLogin(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.replace(/^www\./, "").toLowerCase() !== "twitch.tv") {
      return null;
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return null;
    const login = segments[0].toLowerCase();
    // Twitch logins are 4–25 chars of [a-z0-9_].
    return /^[a-z0-9_]{4,25}$/.test(login) ? login : null;
  } catch {
    return null;
  }
}

type TokenResponse = { access_token?: string; expires_in?: number };

/**
 * An app access token, fetched with client credentials.
 *
 * Cached by `fetch` for an hour. Twitch tokens last ~60 days, so the only
 * thing this cache is protecting is the token endpoint from being hit on every
 * render; an hour is short enough that a rotated secret takes effect the same
 * afternoon.
 */
async function appToken(): Promise<string | null> {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;

  try {
    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}&grant_type=client_credentials`,
      { method: "POST", next: { revalidate: 3600 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as TokenResponse;
    return body.access_token ?? null;
  } catch {
    return null;
  }
}

type HelixStream = {
  user_login: string;
  title: string;
  viewer_count: number;
  started_at: string;
  type: string;
};

/**
 * Which of our channels are live.
 *
 * Never throws. Every failure — no credentials, a Twitch outage, a malformed
 * response — returns an empty list, because this renders inside the root shell
 * and an exception here would 500 every page rather than drop one strip.
 *
 * Revalidated every 60 seconds. A minute late on "someone went live" is
 * invisible to a reader; polling per request would be a Twitch rate limit and
 * a slow site.
 */
export async function getLiveChannels(): Promise<LiveChannel[]> {
  const id = process.env.TWITCH_CLIENT_ID;
  if (!id) return [];

  let rows: {
    name: string;
    url: string | null;
    competitionName: string;
    competitionSlug: string;
  }[];
  try {
    rows = await db
      .select({
        name: watchChannels.name,
        url: watchChannels.url,
        competitionName: competitions.name,
        competitionSlug: competitions.slug,
      })
      .from(watchChannels)
      .innerJoin(competitions, eq(watchChannels.competitionId, competitions.id));
  } catch {
    return [];
  }

  const byLogin = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const login = twitchLogin(row.url);
    if (login && !byLogin.has(login)) byLogin.set(login, row);
  }
  if (byLogin.size === 0) return [];

  const token = await appToken();
  if (!token) return [];

  const query = [...byLogin.keys()]
    .map((login) => `user_login=${encodeURIComponent(login)}`)
    .join("&");

  try {
    const response = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
      headers: { "Client-Id": id, Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];

    const body = (await response.json()) as { data?: HelixStream[] };
    return (body.data ?? [])
      .filter((stream) => stream.type === "live")
      .map((stream) => {
        const row = byLogin.get(stream.user_login.toLowerCase());
        if (!row) return null;
        return {
          login: stream.user_login,
          name: row.name,
          url: row.url ?? `https://www.twitch.tv/${stream.user_login}`,
          competitionName: row.competitionName,
          competitionSlug: row.competitionSlug,
          title: stream.title,
          viewers: stream.viewer_count,
          startedAt: stream.started_at,
        } satisfies LiveChannel;
      })
      .filter((channel): channel is LiveChannel => channel !== null);
  } catch {
    return [];
  }
}
