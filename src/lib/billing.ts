import "server-only";

import { cache } from "react";
import type Stripe from "stripe";

import { isStripeConfigured, stripe } from "@/lib/stripe";

/**
 * What to show a subscriber about their own billing.
 *
 * Read from STRIPE, not from our entitlements table, and the distinction
 * matters. `entitlements` answers "may this person watch" — it is deliberately
 * a plain date range so the paywall stays simple and testable. It cannot
 * answer "when will I next be charged", "am I still in the trial", "which card
 * is on file", or "did I already cancel". Those live in Stripe, and showing a
 * guess at them is how a support conversation starts.
 *
 * Everything here is display only. Nothing on this path grants access — that
 * remains the webhook's job, so a Stripe outage cannot silently open the gate.
 * The same outage makes this return null, and the page says so rather than
 * inventing a date.
 */

export type BillingSummary = {
  status: Stripe.Subscription.Status;
  /** End of the trial, if one is running. */
  trialEndsAt: Date | null;
  /** End of the period already paid for — the next charge date, or the last day of access. */
  periodEndsAt: Date | null;
  /** True when it will not renew: access continues to periodEndsAt, then stops. */
  cancelAtPeriodEnd: boolean;
  amountCents: number | null;
  currency: string;
  interval: string | null;
  card: { brand: string; last4: string } | null;
};

/**
 * The one subscription that matters for this customer.
 *
 * Stripe permits several. Ours should never create a second — startCheckout
 * refuses when one is active — but "should never" is not "cannot", and picking
 * arbitrarily would make the billing page disagree with itself between loads.
 * So: prefer a live one, and among live ones the newest.
 */
function pickSubscription(
  subscriptions: Stripe.Subscription[],
): Stripe.Subscription | null {
  if (subscriptions.length === 0) return null;

  const liveStatuses: Stripe.Subscription.Status[] = [
    "trialing",
    "active",
    "past_due",
  ];

  const live = subscriptions.filter((s) => liveStatuses.includes(s.status));
  const pool = live.length > 0 ? live : subscriptions;

  return [...pool].sort((a, b) => b.created - a.created)[0] ?? null;
}

function readCard(
  subscription: Stripe.Subscription,
): { brand: string; last4: string } | null {
  const method = subscription.default_payment_method;
  // A string means it was not expanded — no card details to show, which is
  // different from "no card on file". Reporting null either way is honest;
  // claiming a brand we did not read would not be.
  if (!method || typeof method === "string") return null;
  const card = method.card;
  return card ? { brand: card.brand, last4: card.last4 } : null;
}

export const getBillingSummary = cache(
  async (stripeCustomerId: string | null): Promise<BillingSummary | null> => {
    if (!stripeCustomerId || !isStripeConfigured()) return null;

    try {
      const list = await stripe().subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 10,
        // Without this the payment method comes back as an id string and the
        // card row would silently render empty on every load.
        expand: ["data.default_payment_method"],
      });

      const subscription = pickSubscription(list.data);
      if (!subscription) return null;

      const item = subscription.items.data[0];
      const price = item?.price;

      return {
        status: subscription.status,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        periodEndsAt: item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amountCents: price?.unit_amount ?? null,
        currency: price?.currency ?? "usd",
        interval: price?.recurring?.interval ?? null,
        card: readCard(subscription),
      };
    } catch (error) {
      // Billing display is not worth a 500. The page falls back to what the
      // entitlements table knows, which is enough to answer "can I watch".
      console.error("[billing] could not read subscription from Stripe:", error);
      return null;
    }
  },
);

/** Money, in the currency Stripe reported rather than an assumed dollar sign. */
export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** A date a human can read, in the viewer's own words rather than an ISO string. */
export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
