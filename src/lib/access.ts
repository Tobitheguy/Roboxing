import "server-only";

import { cache } from "react";

import { getViewer } from "@/lib/auth";
import { decideAccess, type AccessDecision } from "@/lib/entitlements";
import { getEntitlementsForUser } from "@/lib/queries";
import type { EventAccessValue } from "@/db/schema";

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
    startsAt: Date;
  }): Promise<AccessDecision> => {
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
        eventStartsAt: event.startsAt,
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
      eventStartsAt: event.startsAt,
      entitlements,
    });
  },
);
