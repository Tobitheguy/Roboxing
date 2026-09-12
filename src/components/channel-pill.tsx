import { AtSign, CirclePlay, Globe, Radio } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One channel, as a pill you can hit.
 *
 * The watch page used to be rows: channel name, a sentence of note, a region
 * column that said "Worldwide" eighteen times, and a confidence badge. Correct,
 * and far too full — Tobias's word, and he was right. Nobody reads a paragraph
 * to find out where a fight is; they look for the Twitch glyph.
 *
 * So a channel is now an icon and a word. The note survives only on the league
 * page, where there is room for it.
 *
 * NO BRAND MARKS, and that is deliberate rather than lazy. lucide removed its
 * social icons, and the alternative — hand-writing the Twitch or YouTube SVG
 * path from memory — is the same class of mistake as guessing a URL: it looks
 * right until somebody who knows the logo sees it. A generic glyph plus the
 * platform's name is unambiguous and cannot be subtly wrong. If real brand
 * assets are ever licensed, this is the one component to change.
 */

type Platform = {
  icon: typeof Radio;
  /** What the reader is being offered, not who owns it. */
  kind: string;
};

function platformOf(url: string): Platform {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return { icon: Globe, kind: "Link" };
  }

  if (host === "twitch.tv") return { icon: Radio, kind: "Live" };
  if (host.endsWith("youtube.com") || host === "youtu.be") {
    return { icon: CirclePlay, kind: "Video" };
  }
  if (host === "x.com" || host === "twitter.com") {
    return { icon: AtSign, kind: "Social" };
  }
  return { icon: Globe, kind: "Site" };
}

export function ChannelPill({
  name,
  url,
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  if (!url?.trim()) return null;
  const { icon: Icon, kind } = platformOf(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${name} — ${kind}`}
      className={cn(
        "border-line hover:border-ink-dim hover:bg-surface-2 text-ink-muted hover:text-ink inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {name}
    </a>
  );
}
