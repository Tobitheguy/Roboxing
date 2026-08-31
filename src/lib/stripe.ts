import "server-only";

import Stripe from "stripe";

/**
 * Stripe client and the subscription lifecycle.
 *
 * The rule that shapes this file: THE WEBHOOK IS THE SOURCE OF TRUTH, not the
 * redirect back from checkout. A customer can close the tab the moment their
 * card is charged, lose signal, or land on the success page before Stripe has
 * finished — granting access on the redirect means someone who paid cannot
 * watch, which is the single worst bug this system can have.
 */

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it in the Vercel project settings.",
    );
  }

  client = new Stripe(key, {
    // Pinned rather than floating: Stripe ships breaking API changes behind
    // versions, and a subscription system that silently changes shape is not
    // something to discover during a billing cycle.
    apiVersion: "2026-08-26.dahlia",
    appInfo: { name: "Roboxing", url: "https://roboxing.vercel.app" },
  });
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/** Whether the configured key is a test key. Surfaced in the admin UI. */
export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

/**
 * The window a Stripe subscription entitles someone to.
 *
 * Uses the CURRENT PERIOD rather than "is the status active", because that is
 * what the customer actually bought. Someone who cancels today keeps the
 * period they already paid for — Stripe models this as
 * `cancel_at_period_end`, and reading only `status` would cut them off at the
 * moment they clicked cancel, which is both wrong and a chargeback.
 */
export function subscriptionWindow(subscription: Stripe.Subscription): {
  startsAt: Date;
  endsAt: Date;
} | null {
  // A subscription in `incomplete` or `incomplete_expired` was never paid for.
  const entitledStatuses: Stripe.Subscription.Status[] = [
    "active",
    "trialing",
    "past_due",
  ];
  if (!entitledStatuses.includes(subscription.status)) return null;

  const item = subscription.items.data[0];
  const start = item?.current_period_start ?? subscription.start_date;
  const end = item?.current_period_end;
  if (!start || !end) return null;

  return { startsAt: new Date(start * 1000), endsAt: new Date(end * 1000) };
}
