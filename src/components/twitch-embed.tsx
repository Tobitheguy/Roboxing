import { Tv } from "lucide-react";

import { twitchEmbedUrl } from "@/components/live-stream-player";

/**
 * A league's Twitch channel, playing on this page, whether or not it is live.
 *
 * WHY THIS EXISTS SEPARATELY FROM LiveStreamPlayer
 * ------------------------------------------------
 * `LiveStreamPlayer` renders a channel the Twitch API has confirmed is
 * broadcasting right now: it prints the stream title and a viewer count, and
 * it needs credentials to know any of that. On a sport with roughly one event
 * a month, that player is visible for a few hours and absent the rest of the
 * time — and absent entirely if the API credentials are missing.
 *
 * THE EMBED ITSELF NEEDS NO CREDENTIALS AT ALL.
 *
 * That is the thing worth knowing. Twitch's iframe player requires exactly one
 * thing: `parent=<host>` naming every hostname the page is served from. No
 * client id, no secret, no token, no rate limit. Tobias asked how we get UFB's
 * stream onto our page — the answer is that we already can, today, and the
 * API keys he was fighting with buy only the label above the frame.
 *
 * So the channel sits here permanently. Offline, Twitch draws the channel's
 * own offline card, which is a fair "this is where it happens" state and is
 * honest about the fact that nothing is on. The moment UFB goes live, this
 * frame is the stream — no cron, no webhook, nothing to deploy.
 *
 * IT DOES NOT MAKE THIS SITE A RIGHTS HOLDER.
 * Their video, their bitrate, their advertising, their branding. The view
 * counts for the broadcaster, which is why embedding is sanctioned rather
 * than tolerated. "Watch on Twitch" stays one click away, always.
 */
export function TwitchEmbed({
  login,
  channelName,
  competitionName,
  url,
}: {
  login: string;
  channelName: string;
  competitionName: string;
  url: string;
}) {
  return (
    <div className="border-line bg-surface overflow-hidden border-2">
      <div className="bg-canvas relative aspect-video">
        <iframe
          src={twitchEmbedUrl(login)}
          title={`${competitionName} on Twitch`}
          allowFullScreen
          // No `allow="autoplay"`: muted autoplay is permitted without it, and
          // asking for more permission than the feature needs is how an embed
          // ends up blocked by a browser policy later.
          className="absolute inset-0 size-full"
        />
      </div>

      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t-2 px-4 py-3">
        <div className="min-w-0">
          <p className="ticker">{competitionName}</p>
          <p className="text-ink mt-0.5 text-sm font-medium">{channelName}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-line hover:border-volt text-ink-muted hover:text-ink control-h inline-flex shrink-0 items-center gap-1.5 border-2 px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors"
        >
          <Tv className="size-3.5" />
          Watch on Twitch
        </a>
      </div>
    </div>
  );
}
