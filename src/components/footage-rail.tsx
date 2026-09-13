"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { resolveEmbed, youtubeThumbnailUrl } from "@/lib/embeds";
import { cn } from "@/lib/utils";

/**
 * The clips, as an entrance rather than a footnote.
 *
 * The one thing worth taking from a league's own site: this sport's appeal is
 * that you can WATCH it, and our footage was reachable only by opening a news
 * post. The kick that took Matador's head off is the most-seen thing this
 * sport has produced and it was a thumbnail in a list.
 *
 * FACADE, NOT SIX IFRAMES.
 * A YouTube iframe is roughly 150 KB of third-party JavaScript before anyone
 * presses anything, and four of them on a front page is most of a megabyte
 * spent on video nobody asked for yet — plus four sets of Google cookies set
 * on arrival. So each tile is a poster frame until it is clicked, and only the
 * clicked one becomes a player. That is also why the site's PostCard never
 * embeds; this component is the deliberate exception, opted into per click.
 *
 * `youtube-nocookie` on play, and `autoplay=1` because a click on a play
 * button is an unambiguous request for the video to start.
 */

export type FootageItem = {
  slug: string;
  title: string;
  embedUrl: string | null;
  /** Where the footage came from, e.g. "URKL broadcast". Rendered, always. */
  credit?: string | null;
};

export function FootageRail({
  items,
  className,
}: {
  items: FootageItem[];
  className?: string;
}) {
  const [playing, setPlaying] = useState<string | null>(null);

  const playable = items.filter((item) => youtubeThumbnailUrl(item.embedUrl));
  if (playable.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {playable.map((item) => {
        const thumbnail = youtubeThumbnailUrl(item.embedUrl);
        const isPlaying = playing === item.slug;
        // Reuse the site's own resolver: it enforces youtube-nocookie, which is
        // what keeps a clip from setting a Google cookie before anyone presses
        // play. Rebuilding the URL here would quietly lose that.
        const resolved = resolveEmbed(item.embedUrl);
        const embed = resolved?.kind === "iframe" ? resolved.src : null;

        return (
          <figure
            key={item.slug}
            className="border-line bg-surface overflow-hidden rounded-lg border"
          >
            <div className="bg-surface-2 relative aspect-video">
              {isPlaying && embed ? (
                <iframe
                  src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 size-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(item.slug)}
                  aria-label={`Play: ${item.title}`}
                  className="group absolute inset-0 size-full cursor-pointer"
                >
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : null}
                  <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    {/* Void plate, cyan glyph. This was `bg-ink/80 text-white` — under the
                        old skin bg-ink was near-black, so it read as a dark disc with a
                        white arrow. DIR_03 made ink paper-white and the arrow
                        disappeared into its own button. */}
                    <span className="bg-canvas/80 group-hover:bg-canvas text-volt flex size-14 items-center justify-center transition-colors">
                      <Play className="ml-0.5 size-6 fill-current" />
                    </span>
                  </span>
                </button>
              )}
            </div>

            <figcaption className="p-4">
              <Link
                href={`/news/${item.slug}`}
                className="font-display text-ink hover:text-volt line-clamp-2 text-sm font-semibold uppercase transition-colors"
              >
                {item.title}
              </Link>
              {/* The credit is not optional. This is somebody else's footage
                  embedded on our page, and saying whose is the difference
                  between covering a sport and helping yourself to it. */}
              {item.credit ? (
                <p className="text-ink-dim mt-2 text-xs">{item.credit}</p>
              ) : null}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
