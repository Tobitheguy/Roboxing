import Link from "next/link";
import { Newspaper, Trophy } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { FootageRail } from "@/components/footage-rail";
import { JustHappenedUpNext } from "@/components/just-happened-up-next";
import { LeaguesBand } from "@/components/leagues-band";
import { PageShell } from "@/components/page-shell";
import { PostCard } from "@/components/post-card";
import { SideRail } from "@/components/side-rail";
import { pickLeadIndex } from "@/lib/lead-story";
import {
  getLatestResults,
  getNextEvent,
  getPublishedPosts,
} from "@/lib/queries";

/**
 * The home page, for everyone.
 *
 * Third structural pass. The first was a scoreboard (single-league standings,
 * no editorial slot). The second fixed the league problem but ran everything
 * full-width, which read as a stack of sections rather than a front page. This
 * one adopts the layout both UFC.com and ESPN actually run: a main editorial
 * column with a sticky right rail — numbered top stories and a video strip.
 *
 * The rail was REJECTED in the first reference pass, and the reason it comes
 * back now is the reason it was rejected then: content. A rail beside zero
 * posts renders as an abandoned site; beside a real feed it is information
 * density. Same layout, opposite meaning — the inventory decides, not the
 * template.
 *
 * Still deliberately absent: any cross-league standings table. Tables live on
 * the league page that can name them.
 */
export async function HomeDashboard() {
  const [posts, latest, next] = await Promise.all([
    // Enough for the lead, the grid AND the rail from one query — the rail
    // receives these same rows as a prop rather than asking again.
    getPublishedPosts(9),
    getLatestResults(5),
    getNextEvent(),
  ]);

  /*
   * Not `posts[0]`. While an event is imminent its coverage leads, the way
   * every sports front page works — see lib/lead-story.ts for why the
   * alternative (moving the preview's publication date) is the one fix this
   * site cannot make. Reverts to newest-first by itself once the event passes.
   */
  const leadIndex = pickLeadIndex(
    posts,
    next ? { slug: next.event.slug, startsAt: next.event.startsAt } : null,
    new Date(),
  );
  const lead = posts[leadIndex];
  const rest = posts.filter((_, index) => index !== leadIndex);
  const gridPosts = rest.slice(0, 4);

  /*
   * Everything with a playable clip, newest first. Drawn from the same nine
   * posts already fetched above rather than a second query — the rail is a
   * different view of the feed, not different content.
   */
  const footage = posts
    .filter(({ post }) => post.embedUrl)
    .slice(0, 3)
    .map(({ post }) => ({
      slug: post.slug,
      title: post.title,
      embedUrl: post.embedUrl,
      credit: null,
    }));

  return (
    <PageShell>
      <JustHappenedUpNext />

      {/* Main column + rail, the UFC/ESPN shape. On a phone the rail content
          follows the column rather than cramming beside it. */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-title text-ink uppercase">
              Latest coverage
            </h2>
            {posts.length > 0 ? (
              <Link
                href="/news"
                className="text-volt shrink-0 text-xs font-medium underline underline-offset-4"
              >
                All coverage
              </Link>
            ) : null}
          </div>

          {posts.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Newspaper />}
                title="No coverage yet"
                description="Clips and analysis appear here as they are published."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {/* The lead story, full width of the column — every front page
                  needs exactly one thing that is clearly the biggest. */}
              {lead ? (
                <PostCard
                  post={lead.post}
                  eventSlug={lead.eventSlug}
                  eventName={lead.eventName}
                />
              ) : null}
              {gridPosts.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {gridPosts.map(({ post, eventSlug, eventName }) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      eventSlug={eventSlug}
                      eventName={eventName}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Footage as an entrance, not a footnote.
              The kick that took Matador's head off is the most-seen thing this
              sport has produced, and until now it was a thumbnail in a list.
              Poster frames only until a click — see the note in FootageRail on
              why four iframes do not belong on a front page. */}
          {footage.length > 0 ? (
            <div className="mt-10">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="font-display text-title text-ink uppercase">
                  Watch
                </h2>
                <Link
                  href="/watch"
                  className="text-volt shrink-0 text-xs font-medium underline underline-offset-4"
                >
                  Where to watch
                </Link>
              </div>
              <FootageRail items={footage} />
            </div>
          ) : null}

          <div className="mt-8">
            <Card>
              <CardHeader
                title="Latest results"
                action={
                  latest.length > 0 ? (
                    <Link
                      href="/results"
                      className="text-volt text-xs font-medium underline underline-offset-4"
                    >
                      All results
                    </Link>
                  ) : null
                }
              />
              <CardBodyFlush>
                {latest.length > 0 ? (
                  // showLeague, because this list spans every league on the
                  // site and an unattributed result cannot be placed by anyone
                  // who has not memorised which robots fight where.
                  <BoutList bouts={latest} showEvent showLeague />
                ) : (
                  <EmptyState
                    icon={<Trophy />}
                    title="No results recorded"
                    description="Every completed bout shows here with its winner, method and round."
                  />
                )}
              </CardBodyFlush>
            </Card>
          </div>
        </div>

        <SideRail posts={posts} />
      </div>

      <div className="mt-12">
        <LeaguesBand />
      </div>
    </PageShell>
  );
}
