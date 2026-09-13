import { Tv } from "lucide-react";

import { LivePill } from "@/components/live-pill";
import type { LiveChannel } from "@/lib/twitch";

/**
 * Somebody else's live stream, playing on our page.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT
 * --------------------------------
 * It is Twitch's own player in an iframe. Their video, their bitrate, their
 * advertising, their branding — we supply the frame and the context around it.
 * The view counts for the broadcaster, which is exactly why embedding is
 * sanctioned rather than tolerated: Twitch and YouTube both publish embed APIs
 * because a syndicated view is still their view.
 *
 * It does NOT make this site a rights holder and it must never be presented as
 * though it did. The caption names the channel and links out, and "Watch on
 * Twitch" stays one click away.
 *
 * THE PARENT PARAMETER IS THE WHOLE GAME
 * --------------------------------------
 * Twitch refuses to play in an iframe unless `parent` lists the exact hostname
 * embedding it. Not the origin, not a wildcard — the bare host, and one entry
 * per host. Miss one and the player renders a grey box with no error anyone
 * can see from the outside, which is the single most common way a Twitch embed
 * "works locally and is broken in production". Every host this site is served
 * from is listed below, and a new domain has to be added here.
 *
 * Muted by default, because an autoplaying stream with sound is how a visitor
 * closes the tab.
 */

/**
 * Every hostname this site answers on. Twitch checks the embedding host
 * against this list and refuses anything not in it.
 */
const PARENTS = [
  "roboxing.tv",
  "www.roboxing.tv",
  "roboxing.vercel.app",
  "localhost",
];

export function twitchEmbedUrl(login: string): string {
  const parents = PARENTS.map((p) => `parent=${encodeURIComponent(p)}`).join("&");
  return `https://player.twitch.tv/?channel=${encodeURIComponent(login)}&${parents}&muted=true&autoplay=true`;
}

export function LiveStreamPlayer({ channel }: { channel: LiveChannel }) {
  return (
    <div className="border-line bg-surface overflow-hidden rounded-lg border">
      {/* Void behind the frame, not `bg-ink` — ink is the paper-white body
          colour under DIR_03, and a player that has not loaded yet was
          flashing a white rectangle the size of the video. */}
      <div className="bg-canvas relative aspect-video">
        <iframe
          src={twitchEmbedUrl(channel.login)}
          title={`${channel.competitionName} — live on Twitch`}
          allowFullScreen
          // No `allow="autoplay"`: muted autoplay is permitted without it, and
          // asking for more permission than the feature needs is how an embed
          // ends up blocked by a browser policy later.
          className="absolute inset-0 size-full"
        />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <LivePill status="live" />
            <span className="text-ink-dim text-xs tracking-widest uppercase">
              {channel.competitionName}
            </span>
          </div>
          <p className="text-ink text-sm font-medium">{channel.title}</p>
          <p className="text-ink-dim mt-1 text-xs">
            {`${channel.viewers.toLocaleString("en-US")} watching on Twitch`}
          </p>
        </div>

        {/* Always one click to the source. The stream is theirs; we are a
            frame around it, and pretending otherwise would be the one thing
            this site cannot afford to do. */}
        <a
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-line hover:border-ink-dim hover:bg-surface-2 text-ink-muted hover:text-ink inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Tv className="size-3.5" />
          Watch on Twitch
        </a>
      </div>
    </div>
  );
}
