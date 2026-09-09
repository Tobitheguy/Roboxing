/**
 * Which story leads the front page.
 *
 * It used to be `posts[0]` — whatever was published most recently. That is the
 * right rule for an archive and the wrong one for a site whose subject is
 * happening tonight. On the morning of Roboxing's first covered event, the
 * preview of a fight thirteen hours away sat SEVENTH in the feed, below a
 * general explainer and a retrospective on a 2025 exhibition, purely because it
 * had been written forty minutes before the others.
 *
 * The tempting fix is to move its publication date. That is the one thing this
 * site must not do: it claims to be the record, and a record that edits its own
 * timestamps to change a sort order is not one. The date is a fact about when
 * the piece was published, not a lever for arranging a page.
 *
 * So the rule is editorial instead of chronological, and it is the rule every
 * sports front page already follows: **while an event is imminent, its
 * coverage leads.** Afterwards the page reverts to newest-first on its own,
 * because the next event moves on and nothing here holds state.
 */

/** How close an event has to be before its coverage takes the lead. */
export const LEAD_WINDOW_DAYS = 7;

export type LeadCandidate = { eventSlug: string | null };

export type UpcomingEvent = { slug: string; startsAt: Date } | null;

/**
 * Index of the post to lead with. Falls back to 0 — the newest — whenever
 * there is no imminent event or nothing covering it.
 *
 * Returns an index rather than the post itself so the caller can remove
 * exactly that entry from the remainder without an identity comparison.
 */
export function pickLeadIndex(
  posts: LeadCandidate[],
  nextEvent: UpcomingEvent,
  now: Date,
  windowDays: number = LEAD_WINDOW_DAYS,
): number {
  if (posts.length === 0) return 0;
  if (!nextEvent) return 0;

  const msUntil = nextEvent.startsAt.getTime() - now.getTime();
  /*
   * Future only, and inside the window. An event in the past is handled by the
   * "just happened" panel, not by the lead slot — and once a fight is over,
   * its preview is the least interesting thing on the page.
   */
  if (msUntil < 0) return 0;
  if (msUntil > windowDays * 24 * 60 * 60 * 1000) return 0;

  // Posts arrive newest-first, so the first match is the most recent piece
  // about that event — the one that supersedes any earlier coverage of it.
  const index = posts.findIndex((post) => post.eventSlug === nextEvent.slug);
  return index === -1 ? 0 : index;
}
