import "server-only";

import { getAppUrl } from "@/lib/app-url";
import type { Viewer } from "@/lib/auth";
import {
  DEFAULT_INTERVAL,
  PLANS,
  TRIAL_DAYS,
  priceIdFor,
  type BillingInterval,
} from "@/lib/plan";
import {
  isStripeAutomaticTaxEnabled,
  isStripeConfigured,
  stripe,
} from "@/lib/stripe";
import { ensureStripeCustomer, getSubscriptionState } from "@/lib/subscriptions";

/**
 * Start a subscription: one place, used by every route that can begin one.
 *
 * There are two — a Server Action behind a button, and the page a new account
 * lands on straight after signing up. They must not drift, because the checks
 * here are the ones that stop a customer being billed twice. A second copy
 * that forgot the active-subscription test would look identical until the day
 * someone had two subscriptions.
 */

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not_configured" | "already_subscribed" | "failed" };

export async function createCheckoutSession(
  viewer: Viewer,
  interval: BillingInterval = DEFAULT_INTERVAL,
): Promise<CheckoutResult> {
  if (!isStripeConfigured()) return { ok: false, reason: "not_configured" };

  // Resolved from the plan rather than read straight out of the environment.
  // The annual plan deliberately has no fallback to the legacy single-price
  // variable — that variable holds a MONTHLY price, and using it here would
  // charge $9.99 for a year of access.
  const plan = PLANS[interval];
  const priceId = priceIdFor(plan);
  if (!priceId) return { ok: false, reason: "not_configured" };

  // Checked HERE rather than only by hiding a button. Both callers are
  // reachable directly: a Server Action is a POST endpoint anyone with the
  // action id can invoke, and the checkout page is a URL that can be
  // bookmarked, refreshed, or opened in a second tab. The ordinary way to hit
  // this twice is not an attack — it is a double-click before the redirect
  // fires. Either would create a second subscription on the same customer.
  const { active } = await getSubscriptionState(viewer.id);
  if (active) return { ok: false, reason: "already_subscribed" };

  const appUrl = getAppUrl();
  const taxEnabled = isStripeAutomaticTaxEnabled();

  try {
    const customerId = await ensureStripeCustomer(viewer);

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        // The interval is recorded so a support question about which plan
        // someone bought is answered by the subscription itself rather than by
        // reverse-engineering it from the price id.
        metadata: { userId: String(viewer.id), interval: plan.interval },
      },
      // The card is taken now even though nothing is charged today. That is
      // the whole shape of a trial: the customer is set up, and the first
      // charge happens automatically when the trial ends. Without a card on
      // file the trial would simply expire into nothing, which is not what
      // "start your free trial" promises either party.
      payment_method_collection: "always",
      // Stripe appends the session id; the success page uses it only to show a
      // confirmation. Access itself comes from the webhook, never from this
      // redirect — a customer who closes the tab has still paid.
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/plans?plan=${plan.interval}`,
      automatic_tax: { enabled: taxEnabled },
      // Stripe REQUIRES this whenever automatic_tax is on and an existing
      // customer is passed, and rejects it when tax is off.
      ...(taxEnabled ? { customer_update: { address: "auto" as const } } : {}),
      allow_promotion_codes: true,
    });

    if (!session.url) return { ok: false, reason: "failed" };
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[stripe] could not create a checkout session:", error);
    return { ok: false, reason: "failed" };
  }
}
