import type { Metadata } from "next";
import { Newspaper } from "lucide-react";

import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { getPublishedPosts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "News",
  description:
    "Clips, results and analysis from humanoid robot fighting — the events, the teams and what they mean.",
};

/**
 * The feed.
 *
 * The site's front door for anyone who arrives from a clip rather than from a
 * search for a specific robot. Until this existed the platform could list what
 * happened and could not say anything about it, which is the difference
 * between a database and a publication.
 */
export default async function NewsPage() {
  const posts = await getPublishedPosts();

  return (
    <PageShell>
      <PageHeading
        eyebrow="Coverage"
        title="News"
        description="Clips, recaps and analysis. Humanoid robot fighting, in English."
      />

      {posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Newspaper />}
            title="Nothing published yet"
            description="Coverage of the next event will appear here."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map(({ post, eventSlug, eventName }) => (
            <PostCard
              key={post.id}
              post={post}
              eventSlug={eventSlug}
              eventName={eventName}
            />
          ))}
        </div>
      )}

    </PageShell>
  );
}
