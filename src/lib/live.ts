export type LiveNow = {
  eventSlug: string;
  eventName: string;
} | null;

/**
 * Whether anything is broadcasting right now.
 *
 * Drives the LIVE pill in the site header, which is the site's single global
 * piece of state — it has to be correct on every page, so it is resolved in one
 * place rather than passed down from whichever page happens to know.
 *
 * STEP 1: returns null. There is no database yet, and inventing a fake live
 * event to make the header look interesting would put a red LIVE badge on a
 * public URL with nothing behind it. Step 2 replaces the body with a query for
 * `events where status = 'live'`; the signature does not change.
 */
export async function getLiveNow(): Promise<LiveNow> {
  return null;
}
