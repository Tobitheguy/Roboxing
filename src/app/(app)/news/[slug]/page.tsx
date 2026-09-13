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
    /*
     * Paper. Long-form inverts onto #F2F0EA with #0B0F10 ink.
     *
     * Not a theme toggle and not user-selectable — it is a surface with a job.
     * Void is scanned, paper is read, and the inversion is the signal that
     * somebody sat down and thought about this piece rather than filed it.
     *
     * `on-paper` also deepens links to --color-volt-deep: cyan at full
     * strength measures 1.7:1 on paper and fails as text. This is the one
     * place the accent has to change value.
     */
    /* Full-bleed: the paper is the PAGE FIELD, not a card floating on void.
       Wrapping the shell rather than styling it is what makes the inversion
       reach the gutters — an article on a paper column inside a dark frame
       reads as a widget, which is the opposite of "somebody sat down and wrote
       this". `flex-1` so short pieces still fill the viewport. */
    <div className="on-paper bg-paper text-paper-ink flex-1">
      <PageShell>
      <BackLink href="/news" label="All coverage" />
      <article className="mx-auto max-w-[680px]">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Badge variant="outline">
            {post.kind === "clip" ? "Clip" : "Analysis"}
          </Badge>
          {/* No date on an explainer.
              Eight of the first ten posts carry 8 September, because that is
              when the site was built rather than when anything happened. On a
              piece explaining what URKL is, that date is not information -- it
              is a timestamp that makes durable writing look like a stale news
              item. Backdating them would invent a publication history, so the
              honest fix is to print nothing. The feed still orders by it. */}
          {post.publishedAt && !post.evergreen ? (
            <time
              dateTime={post.publishedAt.toISOString()}
              className="text-ink-dim tabular text-xs"
            >
              {formatDateLong(post.publishedAt, "UTC")}
            </time>
          ) : null}
          {post.evergreen ? (
            <span className="text-ink-dim text-xs">Explainer</span>
          ) : null}
          {post.autoPublished ? (
            <Badge variant="outline">Automated brief</Badge>
          ) : null}
        </div>

        {/* Above the headline's fold, not in a footer.
            This post was written by the morning cron from the one source linked
            at the end, and no person read it before it went live. A reader who
            learns that after finishing the piece has already decided how much to
            trust it. The whole value of this site is that its results are right,
            which means being loud about the copy nobody checked. */}
        {post.autoPublished ? (
          <p className="border-line text-ink-dim mt-4 border-l-2 pl-4 text-sm leading-relaxed">
            Written automatically from the source linked below, and not reviewed
            by an editor before publication. Corrections are welcome.
          </p>
        ) : null}

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
    </div>
  );
}
