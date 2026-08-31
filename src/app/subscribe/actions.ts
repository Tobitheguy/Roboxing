"use server";

import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { PLAN } from "@/lib/plan";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  getSubscriptionState,
} from "@/lib/subscriptions";

/**
 * Start checkout.
 *
 * Returns an error string rather than throwing so the page can say something
 * useful. The only success path is a redirect to Stripe.
 */
export async function startCheckout(): Promise<string | void> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?redirect_url=%2Fsubscribe");

  if (!isStripeConfigured()) {
    return "Checkout is not configured yet.";
  }

  // Checked HERE, not only by hiding the button. A Server Action is a POST
  // endpoint that anyone with the action id can call, and the ordinary way to
  // hit this is not an attack — it is a double-click before the redirect
  // fires, or a second tab. Either would create a second subscription against
  // the same customer and bill them twice.
  const { active } = await getSubscriptionState(viewer.id);
  if (active) return "You already have an active subscription.";

  const appUrl = getAppUrl();
  let url: string | null = null;

  try {
    const customerId = await ensureStripeCustomer(viewer);

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: {
        trial_period_days: PLAN.trialDays,
        metadata: { userId: String(viewer.id) },
      },
      // Stripe appends the session id; the success page uses it only to show a
      // confirmation. Access itself comes from the webhook, never from this
      // redirect — a customer who closes the tab has still paid.
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe`,
      // Lets Stripe collect the tax it is obliged to, based on the customer's
      // location, rather than us guessing at VAT rules per country.
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    });

    url = session.url;
  } catch (error) {
    console.error("[stripe] could not create a checkout session:", error);
    return "Could not start checkout. Please try again.";
  }

  if (!url) return "Could not start checkout. Please try again.";

  // Outside the try: redirect() signals by throwing, and catching it here
  // would turn a successful checkout into an error message.
  redirect(url);
}

/**
 * Open Stripe's billing portal.
 *
 * Cancellation, payment method changes and invoices all live there. Building
 * our own version of that would mean reimplementing dunning, proration and
 * invoice history — and getting any of it wrong is a chargeback.
 */
export async function openBillingPortal(): Promise<string | void> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  if (!isStripeConfigured()) return "Billing is not configured yet.";

  let url: string | null = null;
  try {
    const customerId = await ensureStripeCustomer(viewer);
    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/subscribe`,
    });
    url = session.url;
  } catch (error) {
    console.error("[stripe] could not open the billing portal:", error);
    return "Could not open billing. Please try again.";
  }

  if (!url) return "Could not open billing. Please try again.";
  redirect(url);
}
