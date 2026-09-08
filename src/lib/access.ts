import "server-only";

import { cache } from "react";

import { getViewer } from "@/lib/auth";
import { decideAccess, type AccessDecision } from "@/lib/entitlements";
import { getEntitlementsForUser } from "@/lib/queries";
import type { EventAccessValue } from "@/db/schema";

/**
 * Is anything on this site for sale?
 *
 * Off unless the environment says otherwise, and that default is the product
 * decision rather than a config convenience. Roboxing is not a rights holder;
 * it is the record of a sport whose events belong to other people. There is
 * nothing to charge for, and a subscription prompt in front of a page that
 * merely lists somebody else's fight card is both a bad offer and a false
 * description of what the site is.
 *
 * The machinery underneath — entitlements, Stripe, the webhook, the trial —
 * is deliberately NOT deleted. It is built, it is tested, and it is exactly
 * what is needed the day there is a broadcast to sell. Ripping it out to
 * re-derive it later, under time pressure, in the fortnight before a first
 * paid night, is how paywalls end up wrong in the direction that refunds
 * customers. So it stays, dormant, exercised by its tests.
 *
 * Flip PAYWALL_ENABLED=true and every code path below wakes up unchanged.
 * Mirrors REQUIRE_TWO_FACTOR, which is off for the same shape of reason.
 */
export function isPaywallEnabled(): boolean {
  return process.env.PAYWALL_ENABLED === "true";
}

/**
 * May the current viewer watch this event?
 *
 * One function used by BOTH the watch page and the playback endpoint, on
 * purpose. If the page decided independently of the endpoint, the two could
 * disagree — and the disagreement that matters is the page hiding the player
 * while the endpoint still hands out a working manifest URL to anyone who
 * calls it directly. A paywall enforced only in the UI is not a paywall.
 */
export const checkEventAccess = cache(
  async (event: {
    id: number;
    access: EventAccessValue;
  }): Promise<AccessDecision> => {
    // The kill switch, checked BEFORE the event's own setting. An event left
    // as `subscription` from an earlier plan — or set that way by a mis-click
    // in admin — must not put a wall in front of a site that is not selling
    // anything. The row's value is preserved for the day the switch flips.
    if (!isPaywallEnabled()) {
      return { allowed: true, reason: "free" };
    }

    // Skip the viewer lookup entirely for free events — which is every event
    // today, so this is the path that actually runs.
    if (event.access === "free") {
      return { allowed: true, reason: "free" };
    }

    const viewer = await getViewer();
    if (!viewer) {
      return decideAccess({
        eventId: event.id,
        eventAccess: event.access,
        now: new Date(),
        entitlements: null,
      });
    }

    // Administrators can always watch. They have to be able to check the
    // stream is up, and telling the person running the broadcast to buy a
    // subscription first is absurd.
    if (viewer.isAdmin) {
      return { allowed: true, reason: "entitled" };
    }

    const entitlements = await getEntitlementsForUser(viewer.id);

    return decideAccess({
      eventId: event.id,
      eventAccess: event.access,
      now: new Date(),
      entitlements,
    });
  },
);
