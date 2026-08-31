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

  const byCustomerId = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  let user: { id: number } | undefined = byCustomerId[0];

  if (!user) {
    // Fall back to matching on email, then store the link.
    //
    // Two cases this rescues, both of which otherwise end as "they paid and
    // cannot watch": a subscription created directly in the Stripe dashboard
    // (a comp, or support fixing something), and a customer whose id never got
    // written back because the checkout was started elsewhere. Stripe stops
    // retrying after a few days, so a webhook that only ever waits for our own
    // write to appear will eventually give up in silence.
    user = await linkByEmail(customerId);
  }

  if (!user) {
    console.error(
      `[stripe] no local user for customer ${customerId} and no email match. ` +
        `Subscription ${subscription.id} is UNAPPLIED — someone may have paid ` +
        `and be unable to watch.`,
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

  // Not entitled any more — the subscription lapsed or was never paid.
  //
  // Removing the row and leaving it with a past end date are equivalent: access
  // is decided against the PRESENT moment, so an expired window denies either
  // way. Removing keeps cancelled customers from accumulating dead rows.
  //
  // This does mean a lapsed subscriber loses the back catalogue, which is
  // correct and is what the pricing page says — access runs until the period
  // ends. Cancelling is not a purchase.
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
 * Find a user by the Stripe customer's email address and record the link.
 *
 * Only reached when the customer id is not already stored, so the extra Stripe
 * call costs nothing in the normal path.
 */
async function linkByEmail(
  customerId: string,
): Promise<{ id: number } | undefined> {
  try {
    const customer = await stripe().customers.retrieve(customerId);
    if (customer.deleted) return undefined;

    const email = customer.email?.trim().toLowerCase();
    if (!email) return undefined;

    const [match] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!match) return undefined;

    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, match.id));

    console.warn(
      `[stripe] linked customer ${customerId} to user ${match.id} by email`,
    );
    return match;
  } catch (error) {
    console.error("[stripe] email fallback failed:", error);
    return undefined;
  }
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
