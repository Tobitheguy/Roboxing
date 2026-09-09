import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { Badge } from "@/components/badge";
import { PageShell } from "@/components/page-shell";
import { PostEmbed } from "@/components/post-embed";
import { RichText } from "@/components/rich-text";
import { getAppUrl } from "@/lib/app-url";
import { youtubeThumbnailUrl } from "@/lib/embeds";
import { formatDateLong } from "@/lib/format";
import { getPostBySlug } from "@/lib/queries";

/**
 * One post.
 *
 * `getPostBySlug` applies the published check itself, so an unpublished or
 * scheduled slug 404s here rather than rendering. That is deliberate: the
 * alternative — fetching then branching in the page — is one forgotten early
 * return away from serving a draft to anyone who guesses the URL.
 */

export async function generateMetadata(
  props: PageProps<"/news/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const row = await getPostBySlug(slug);
  if (!row) return { title: "Not found" };

  const { post } = row;
  return {
    title: post.title,
    description: post.summary ?? undefined,
    openGraph: {
      // `article`, not `website` — it is what tells a share card to show the
      // published date and treat this as a story rather than a landing page.
      type: "article",
      title: post.title,
      description: post.summary ?? undefined,
      publishedTime: post.publishedAt?.toISOString(),
      url: `${getAppUrl()}/news/${post.slug}`,
      /*
       * A set cover wins; otherwise the video's own poster frame, so a shared
       * clip post unfurls with the footage rather than the generic site card.
       *
       * Spread in, never written as `images: undefined`. Setting the key at
       * all — even to undefined — counts as explicit metadata and beats both
       * the `opengraph-image` file convention and the site-wide fallback, so
       * a post with no cover and no embed ended up with NO og:image whatever.
       * Absent means "fall back"; present-and-undefined means "nothing".
       */
      ...(() => {
        const image = post.coverImageUrl ?? youtubeThumbnailUrl(post.embedUrl);
        return image ? { images: [{ url: image }] } : {};
      })(),
    },
  };
}

export default async function PostPage(props: PageProps<"/news/[slug]">) {
  const { slug } = await props.params;
  const row = await getPostBySlug(slug);
  if (!row) notFound();

  const { post, eventSlug, eventName } = row;

  return (
    <PageShell>
      <BackLink href="/news" label="All coverage" />
      <article className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Badge variant="outline">
            {post.kind === "clip" ? "Clip" : "Analysis"}
          </Badge>
          {post.publishedAt ? (
            <time
              dateTime={post.publishedAt.toISOString()}
              className="text-ink-dim tabular text-xs"
            >
              {formatDateLong(post.publishedAt, "UTC")}
            </time>
          ) : null}
        </div>

        <h1 className="font-display text-hero text-ink uppercase">
          {post.title}
        </h1>

        {post.summary ? (
          <p className="text-ink-muted mt-4 text-lg leading-relaxed">
            {post.summary}
          </p>
        ) : null}

        {post.embedUrl ? (
          <div className="mt-8">
            <PostEmbed url={post.embedUrl} title={post.title} />
          </div>
        ) : null}

        {/* Text and `[label](url)` links only — still no HTML path into a
            body. See the parser note in `lib/embeds`. */}
        <RichText body={post.body} className="mt-8 space-y-4" />

        {eventSlug && eventName ? (
          <div className="border-line mt-10 border-t pt-6">
            <Link
              href={`/events/${eventSlug}`}
              className="text-ink-muted hover:text-volt inline-flex items-center gap-2 text-sm transition-colors"
            >
              <CalendarDays className="size-4" />
              Full card, results and picks — {eventName}
            </Link>
          </div>
        ) : null}

      </article>
    </PageShell>
  );
}
