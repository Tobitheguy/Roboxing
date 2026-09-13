import {
  SiBilibili,
  SiBluesky,
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiTwitch,
  SiWechat,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { Globe } from "lucide-react";

import type { WatchChannel } from "@/db/schema";
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
 * REAL BRAND MARKS.
 *
 * The first version used lucide's Radio, CirclePlay and AtSign, because lucide
 * dropped its social icons and I would not hand-write a Twitch path from
 * memory — a logo drawn from recollection is wrong in a way only people who
 * know the logo can see, which is everybody. The reasoning was right and the
 * conclusion was wrong: the answer was never "draw it myself or settle for a
 * circle", it was to install the set that already has them.
 *
 * `simple-icons` supplies verified path data for every platform this sport
 * touches, including the Chinese ones that matter here — Bilibili, WeChat.
 * Identifying a platform you are linking TO is nominative use, the same
 * convention that puts a YouTube mark on a "watch on YouTube" button.
 *
 * Rendered in currentColor, not brand colours. The design system owns one
 * accent with a job; eight brand palettes on a card would be seven more hues
 * than the site has. The SHAPE identifies — the colour is their marketing.
 */

type IconType = typeof SiX;

/** Host → its real mark. Anything unmatched is a website, not a platform. */
const BRANDS: { match: (h: string) => boolean; icon: IconType; kind: string }[] = [
  { match: (h) => h === "twitch.tv", icon: SiTwitch, kind: "Twitch" },
  {
    match: (h) => h.endsWith("youtube.com") || h === "youtu.be",
    icon: SiYoutube,
    kind: "YouTube",
  },
  { match: (h) => h === "x.com" || h === "twitter.com", icon: SiX, kind: "X" },
  { match: (h) => h.endsWith("instagram.com"), icon: SiInstagram, kind: "Instagram" },
  { match: (h) => h.endsWith("tiktok.com"), icon: SiTiktok, kind: "TikTok" },
  { match: (h) => h.endsWith("bsky.app"), icon: SiBluesky, kind: "Bluesky" },
  { match: (h) => h.endsWith("bilibili.com"), icon: SiBilibili, kind: "Bilibili" },
  { match: (h) => h.endsWith("weixin.qq.com"), icon: SiWechat, kind: "WeChat" },
  { match: (h) => h.endsWith("facebook.com"), icon: SiFacebook, kind: "Facebook" },
];

function platformOf(url: string): {
  icon: IconType | typeof Globe;
  kind: string;
} {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return { icon: Globe, kind: "Link" };
  }
  const brand = BRANDS.find((b) => b.match(host));
  return brand
    ? { icon: brand.icon, kind: brand.kind }
    : { icon: Globe, kind: "Website" };
}

/**
 * The availability state, in the same one-hue-three-densities grammar as the
 * confidence chips — because it is the same kind of claim. Filled means we
 * checked and it plays here; an outline means it exists elsewhere; the colour
 * drops out entirely when there is nothing to watch.
 *
 * `vod_removed` is the one that earns the page. A stream that has been taken
 * down STAYS LISTED: its absence is part of the record, and nobody else is
 * keeping that list.
 */
const AVAILABILITY: Record<
  NonNullable<WatchChannel["availability"]>,
  { label: string; className: string }
> = {
  embedded: { label: "Embedded", className: "chip-confirmed" },
  link_only: { label: "Link only", className: "chip-reported" },
  geo_locked: { label: "Geo-locked", className: "chip-unconfirmed" },
  vod_removed: { label: "VOD removed", className: "chip-unconfirmed" },
  never_published: { label: "Never published", className: "chip-unconfirmed" },
};

export function ChannelPill({
  name,
  url,
  availability,
  className,
}: {
  name: string;
  url: string | null;
  /** Null means nobody has checked — which is not a state, so nothing renders. */
  availability?: WatchChannel["availability"];
  className?: string;
}) {
  if (!url?.trim()) return null;
  const { icon: Icon, kind } = platformOf(url);
  const state = availability ? AVAILABILITY[availability] : null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${name} — ${kind}`}
      className={cn(
        "border-line hover:border-volt hover:bg-surface-2 text-ink-muted hover:text-ink inline-flex items-center gap-2 border-2 px-2.5 py-1.5 text-xs font-medium transition-colors",
        className,
      )}
    >
      <Icon size={14} className="shrink-0" aria-hidden />
      {name}
      {state ? (
        <span
          className={cn(
            "font-mono ml-1 px-1.5 py-px text-[9px] font-bold tracking-[0.08em] uppercase",
            state.className,
          )}
        >
          {state.label}
        </span>
      ) : null}
    </a>
  );
}
