import type {
  EntitlementKindValue,
  EventAccessValue,
} from "@/db/schema";

/**
 * Who may watch what.
 *
 * This is the only thing standing between a paying subscriber and a stranger
 * with the URL, so it is a pure function with no database, no clock, and no
 * network — `now` is passed in — and every branch is reachable from a test.
 *
 * THE RULE: a subscription grants the whole library while it is active. Not
 * "the events that happened during your subscription" — the whole library, for
 * as long as you are paying. That is what a subscription is, it is what the
 * pricing page promises, and it is why the back catalogue is worth anything to
 * a new subscriber.
 *
 * The first version of this file checked the entitlement window against the
 * EVENT's start time instead of the present moment. That is pay-per-view
 * logic wearing a subscription's clothes: it locked a brand-new subscriber out
 * of every event that happened before they joined, which is most of the value
 * they just paid for. Corrected here, and the tests below pin the corrected
 * behaviour in both directions.
 *
 * A per-event grant (`ppv`, not sold today) still works the other way round —
 * it unlocks one named event, and keeps doing so.
 */

export type EntitlementRecord = {
  kind: EntitlementKindValue;
  /** Null for a blanket grant; set for a single-event purchase. */
  eventId: number | null;
  startsAt: Date;
  /** Null means open-ended. */
  endsAt: Date | null;
};

export type AccessRequest = {
  eventId: number;
  eventAccess: EventAccessValue;
  /**
   * The moment the question is being asked. Passed in rather than read from
   * the clock so this function stays pure and testable — and so a single
   * render cannot see two different "now"s.
   */
  now: Date;
  /** Null when nobody is signed in. */
  entitlements: EntitlementRecord[] | null;
};

export type AccessDecision =
  | { allowed: true; reason: "free" | "entitled" }
  | { allowed: false; reason: "sign_in_required" | "subscription_required" };

function isActiveAt(entitlement: EntitlementRecord, instant: Date): boolean {
  if (entitlement.startsAt.getTime() > instant.getTime()) return false;
  if (entitlement.endsAt === null) return true;
  return entitlement.endsAt.getTime() > instant.getTime();
}

export function decideAccess(request: AccessRequest): AccessDecision {
  // Free events stay free for everyone, signed in or not. This is the branch
  // that runs today for every event on the site.
  if (request.eventAccess === "free") {
    return { allowed: true, reason: "free" };
  }

  // Not signed in: there is no entitlement to find. Kept distinct from
  // "signed in but not subscribed" so the UI can offer the right button —
  // telling an existing subscriber to buy again is how refunds happen.
  if (request.entitlements === null) {
    return { allowed: false, reason: "sign_in_required" };
  }

  const entitled = request.entitlements.some((entitlement) => {
    // A per-event grant only ever unlocks its own event.
    if (
      entitlement.eventId !== null &&
      entitlement.eventId !== request.eventId
    ) {
      return false;
    }
    // Active right now — not "active when the event happened".
    return isActiveAt(entitlement, request.now);
  });

  return entitled
    ? { allowed: true, reason: "entitled" }
    : { allowed: false, reason: "subscription_required" };
}
