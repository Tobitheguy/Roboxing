import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { entitlements, users } from "@/db/schema";
import { stripe, subscriptionWindow } from "@/lib/stripe";

/**
 * Keep a Stripe subscription and our entitlement row in step.
 *
 * Written to be safely re-runnable with the same input. Stripe delivers
 * webhooks at least once and out of order, so the same event can arrive twice
 * and a later event can arrive before an earlier one. Anything that appended
 * rather than reconciled would hand a customer two overlapping entitlements
 * and make "when does this person's access end" unanswerable.
 */
export async function syncSubscriptionEntitlement(
  subscription: Stripe.Subscription,
): Promise<{ userId: number | null; granted: boolean }> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) {
    // The webhook can beat our own database write on a first purchase. Logged
    // rather than thrown: throwing makes Stripe retry, and the retry is
    // exactly the right recovery — by then the customer id will be stored.
    console.warn(
      `[stripe] no local user for customer ${customerId}; will retry on redelivery`,
    );
    return { userId: null, granted: false };
  }

  const window = subscriptionWindow(subscription);

  const [existing] = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, user.id),
        eq(entitlements.stripeRef, subscription.id),
      ),
    )
    .limit(1);

  // Not entitled any more — the subscription lapsed or was never paid. The row
  // is removed rather than left with a past end date, so a cancelled customer
  // does not accumulate dead entitlements. Their access to events that already
  // happened inside a paid window is unaffected: access is decided against the
  // EVENT's date, and a removed row simply removes a window that had ended.
  if (!window) {
    if (existing) {
      await db.delete(entitlements).where(eq(entitlements.id, existing.id));
    }
    return { userId: user.id, granted: false };
  }

  if (existing) {
    await db
      .update(entitlements)
      .set({ startsAt: window.startsAt, endsAt: window.endsAt })
      .where(eq(entitlements.id, existing.id));
  } else {
    await db.insert(entitlements).values({
      userId: user.id,
      kind: "subscription",
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      stripeRef: subscription.id,
    });
  }

  return { userId: user.id, granted: true };
}

/**
 * The Stripe customer for a viewer, creating one on first need.
 *
 * Reuses the stored id so a returning subscriber keeps one customer record
 * rather than collecting a new one per checkout — which would scatter their
 * invoices and payment methods across duplicates and turn a refund into a
 * search.
 */
export async function ensureStripeCustomer(viewer: {
  id: number;
  email: string;
  displayName: string | null;
  clerkUserId: string;
}): Promise<string> {
  const [row] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, viewer.id))
    .limit(1);

  if (row?.stripeCustomerId) return row.stripeCustomerId;

  const customer = await stripe().customers.create({
    email: viewer.email,
    name: viewer.displayName ?? undefined,
    // Lets a Stripe-side investigation land back on the right account without
    // a database lookup.
    metadata: { clerkUserId: viewer.clerkUserId, userId: String(viewer.id) },
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, viewer.id));

  return customer.id;
}

/**
 * Whether a viewer's access is active right now, and until when.
 *
 * Lives here rather than inline in the page: reading the clock during a
 * component's render is impure, and React's lint rules reject it for good
 * reason — a value that changes between renders of the same tree produces
 * inconsistent output within one response.
 */
export const getSubscriptionState = cache(
  async (userId: number): Promise<{ active: boolean; until: Date | null }> => {
    const rows = await db
      .select({ startsAt: entitlements.startsAt, endsAt: entitlements.endsAt })
      .from(entitlements)
      .where(eq(entitlements.userId, userId));

    const now = Date.now();
    const covering = rows.filter(
      (r) =>
        r.startsAt.getTime() <= now &&
        (r.endsAt === null || r.endsAt.getTime() > now),
    );

    const until = covering
      .map((r) => r.endsAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return { active: covering.length > 0, until: until ?? null };
  },
);
