import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { youtubeThumbnailUrl } from "@/lib/embeds";
import type { getPublishedPosts } from "@/lib/queries";

type PostRow = Awaited<ReturnType<typeof getPublishedPosts>>[number];

/**
 * The right rail: numbered top stories, then a video strip.
 *
 * UFC's TOP STORIES and ESPN's ICYMI, which are the two right-rail modules
 * from the reference pass that survive contact with a thin content base. A
 * numbered list works at five items; a "trending" algorithm needs traffic we
 * do not have, so the ranking is honest and simple — newest first. When there
 * is real readership data, this is where an actual most-read ranking slots in.
 *
 * Takes posts as a prop rather than querying, deliberately: the home page has
 * already fetched the feed once, and a rail that queries again is a second
 * round trip to disagree with the column it sits beside.
 */
export function SideRail({ posts }: { posts: PostRow[] }) {
  const stories = posts.slice(0, 5);
  const videos = posts
    .filter((p) => youtubeThumbnailUrl(p.post.embedUrl))
    .slice(0, 4);

  if (stories.length === 0) return null;

  return (
    <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <Card>
        <CardHeader title="Top stories" />
        <CardBodyFlush>
          <ol>
            {stories.map(({ post }, index) => (
              <li
                key={post.id}
                className="border-line/60 border-b last:border-b-0"
              >
                <Link
                  href={`/news/${post.slug}`}
                  className="group flex gap-3 px-4 py-3 sm:px-5"
                >
                  {/* The rank, worn as UFC wears it: a filled square. Ink,
                      not the accent — five accent blocks in a stack would
                      out-shout everything else on the page. */}
                  {/* `text-canvas`, not `text-white`. In the old light palette bg-ink was
                      black and white text sat on it; DIR_03 makes ink near-white, so
                      this rendered a white number on a white square. The pair has to
                      invert together — that is what the token pair is FOR. */}
                  <span className="bg-ink text-canvas font-display flex size-6 shrink-0 items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-ink group-hover:text-volt min-w-0 text-sm leading-snug font-medium transition-colors">
                    {post.title}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </CardBodyFlush>
      </Card>

      {videos.length > 0 ? (
        <Card>
          <CardHeader
            title="Watch"
            action={
              <Link
                href="/news"
                className="text-volt text-xs font-medium underline underline-offset-4"
              >
                All
              </Link>
            }
          />
          <CardBodyFlush>
            <ul>
              {videos.map(({ post }) => {
                const thumbnail = youtubeThumbnailUrl(post.embedUrl)!;
                return (
                  <li
                    key={post.id}
                    className="border-line/60 border-b last:border-b-0"
                  >
                    <Link
                      href={`/news/${post.slug}`}
                      className="group flex items-center gap-3 px-4 py-3 sm:px-5"
                    >
                      <span className="relative block aspect-video w-24 shrink-0 overflow-hidden rounded">
                        <Image
                          src={thumbnail}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Play className="size-4 fill-white text-white drop-shadow" />
                        </span>
                      </span>
                      <span className="text-ink group-hover:text-volt min-w-0 text-sm leading-snug font-medium transition-colors">
                        {post.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBodyFlush>
        </Card>
      ) : null}
    </div>
  );
}
