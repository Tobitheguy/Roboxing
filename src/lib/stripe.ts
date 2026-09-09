import "server-only";

import Stripe from "stripe";

import { isTestStripeKey, isValidStripeKeyShape } from "@/lib/stripe-key";

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
    // The canonical domain. Cosmetic — it identifies us in Stripe's logs and
    // partner dashboard — but a stale one there is a support call that starts
    // by pointing at the wrong site.
    appInfo: { name: "Roboxing", url: "https://roboxing.tv" },
  });
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/**
 * Whether the configured key is a test key. Drives the "no real money moves"
 * notice on the pricing page. See stripe-key.ts for why this is not a prefix
 * check on `sk_`.
 */
export function isStripeTestMode(): boolean {
  return isTestStripeKey(process.env.STRIPE_SECRET_KEY);
}

/**
 * Whether to let Stripe calculate and add tax at checkout.
 *
 * Off by default, and that is the correct default rather than a shortcut.
 * Stripe Tax has to be switched on in the dashboard AND backed by real tax
 * registrations before it computes anything meaningful; called without that
 * setup it fails the checkout outright, so the first thing a customer would
 * meet is an error. And a business with no registrations has no tax to
 * collect — adding a line that says otherwise would be worse than omitting it.
 *
 * Flip STRIPE_AUTOMATIC_TAX=true once the company is registered and Stripe Tax
 * is configured. Nothing else needs to change.
 */
export function isStripeAutomaticTaxEnabled(): boolean {
  return process.env.STRIPE_AUTOMATIC_TAX === "true";
}

/** Guards against deploying a key of the wrong shape entirely. */
export function isStripeKeyShapeValid(): boolean {
  return isValidStripeKeyShape(process.env.STRIPE_SECRET_KEY);
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

  // start_date is when the subscription was FIRST created and never moves.
  // current_period_start advances every renewal, so using it would rewrite the
  // window's start each month — harmless for "is it active now", misleading in
  // every support conversation and in the audit trail.
  const item = subscription.items.data[0];
  const start = subscription.start_date ?? item?.current_period_start;
  const end = item?.current_period_end;
  if (!start || !end) return null;

  return { startsAt: new Date(start * 1000), endsAt: new Date(end * 1000) };
}
