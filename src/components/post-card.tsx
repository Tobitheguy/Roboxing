import Image from "next/image";
import Link from "next/link";
import { Clapperboard, FileText, Play } from "lucide-react";

import { Badge } from "@/components/badge";
import { youtubeThumbnailUrl } from "@/lib/embeds";
import { formatDateLong } from "@/lib/format";
import type { Post } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * One post in a list.
 *
 * Carries the video's poster frame when the post embeds a YouTube clip —
 * pulled from YouTube's thumbnail CDN, not re-hosted, which keeps the "we
 * never host the video" rule intact while giving the card an image. A card
 * with a poster and a play glyph is the difference between a feed that looks
 * like a publication and one that looks like a sitemap.
 *
 * The PLAYER still never renders in a list. Six cards with six iframes is
 * most of a megabyte before anyone presses anything; the player lives on the
 * post's own page, and the poster is the promise of it.
 */
export function PostCard({
  post,
  eventSlug,
  eventName,
  className,
}: {
  post: Pick<
    Post,
    "slug" | "title" | "summary" | "kind" | "publishedAt" | "embedUrl"
  >;
  eventSlug?: string | null;
  eventName?: string | null;
  className?: string;
}) {
  const Icon = post.kind === "clip" ? Clapperboard : FileText;
  const thumbnail = youtubeThumbnailUrl(post.embedUrl);

  return (
    <article
      className={cn(
        "border-line bg-surface/50 hover:border-ink-dim group overflow-hidden rounded-lg border transition-colors",
        className,
      )}
    >
      {thumbnail ? (
        <Link
          href={`/news/${post.slug}`}
          className="relative block aspect-video overflow-hidden"
          tabIndex={-1}
          aria-hidden
        >
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {/* The play glyph says "there is footage here" from across the
              page — it is the single strongest signal a sports card can
              carry, which is why UFC and ESPN put it on everything. */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          </span>
        </Link>
      ) : null}

      <div className="p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Icon className="mr-1 inline size-3 align-[-1px]" />
            {post.kind === "clip" ? "Clip" : "Analysis"}
          </Badge>
          {post.publishedAt ? (
            <time
              dateTime={post.publishedAt.toISOString()}
              className="text-ink-dim tabular text-xs"
            >
              {/* UTC, not the reader's zone. A publication date is not an
                  appointment — it does not need converting, and rendering it
                  per-viewer would make it a hydration mismatch for no gain. */}
              {formatDateLong(post.publishedAt, "UTC")}
            </time>
          ) : null}
        </div>

        <h3 className="font-display text-ink text-lg leading-tight font-semibold uppercase">
          <Link
            href={`/news/${post.slug}`}
            className="hover:text-volt transition-colors"
          >
            {post.title}
          </Link>
        </h3>

        {post.summary ? (
          <p className="text-ink-muted mt-2 line-clamp-3 text-sm">
            {post.summary}
          </p>
        ) : null}

        {eventSlug && eventName ? (
          <p className="mt-3 text-xs">
            <Link
              href={`/events/${eventSlug}`}
              className="text-ink-dim hover:text-volt transition-colors"
            >
              {eventName}
            </Link>
          </p>
        ) : null}
      </div>
    </article>
  );
}
