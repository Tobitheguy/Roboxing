import { permanentRedirect } from "next/navigation";

/**
 * The old event URL.
 *
 * Every event moved to `/events/[slug]`, because most of them are not ours to
 * broadcast and `/watch/` promised a player that will not be there. This route
 * stays behind because links do not: the .ics files already sitting in
 * people's calendars point here, so do the Google Calendar entries generated
 * before the move, and so does anything already posted.
 *
 * 308 rather than 307 — the move is permanent, and it is the status that tells
 * a search engine to transfer the old URL's standing to the new one instead of
 * indexing both.
 */
export default async function WatchRedirect(
  props: PageProps<"/watch/[slug]">,
) {
  const { slug } = await props.params;
  permanentRedirect(`/events/${slug}`);
}
