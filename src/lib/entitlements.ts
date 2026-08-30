import type {
  EntitlementKindValue,
  EventAccessValue,
} from "@/db/schema";

/**
 * Who may watch what.
 *
 * This is the only thing standing between a paying subscriber and a stranger
 * with the URL, so it is a pure function with no database, no clock, and no
 * network — every branch is reachable from a test. The query layer feeds it.
 *
 * The rule it enforces is deliberately about TIME, not about a boolean on the
 * user. A subscription grants access to events that happen inside its window.
 * That single choice answers two questions correctly that a simple
 * `user.isSubscribed` flag gets wrong in opposite directions:
 *
 *   - Someone who cancels keeps access to events they had already paid for.
 *   - Someone who subscribes today does not retroactively unlock last month's
 *     card, which they never paid for.
 */

export type EntitlementRecord = {
  kind: EntitlementKindValue;
  /** Null for blanket grants; set for a single-event purchase. */
  eventId: number | null;
  startsAt: Date;
  /** Null means open-ended. */
  endsAt: Date | null;
};

export type AccessRequest = {
  eventId: number;
  eventAccess: EventAccessValue;
  /**
   * When the event starts. The entitlement window is checked against this
   * rather than against "now", so a replay watched months later still plays
   * for whoever was subscribed on the night.
   */
  eventStartsAt: Date;
  /** Null when nobody is signed in. */
  entitlements: EntitlementRecord[] | null;
};

export type AccessDecision =
  | { allowed: true; reason: "free" | "entitled" }
  | { allowed: false; reason: "sign_in_required" | "subscription_required" };

function coversInstant(entitlement: EntitlementRecord, instant: Date): boolean {
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

  // Not signed in: there is no entitlement to find. Distinguished from
  // "signed in but not subscribed" so the UI can say the useful thing —
  // "sign in" and "subscribe" are different buttons.
  if (request.entitlements === null) {
    return { allowed: false, reason: "sign_in_required" };
  }

  const entitled = request.entitlements.some((entitlement) => {
    // A per-event grant only unlocks its own event.
    if (entitlement.eventId !== null && entitlement.eventId !== request.eventId) {
      return false;
    }
    // Complimentary and per-event grants still respect their window; an
    // open-ended one simply has no end.
    return coversInstant(entitlement, request.eventStartsAt);
  });

  return entitled
    ? { allowed: true, reason: "entitled" }
    : { allowed: false, reason: "subscription_required" };
}
