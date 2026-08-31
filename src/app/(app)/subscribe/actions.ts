"use server";

import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { createCheckoutSession } from "@/lib/checkout";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/subscriptions";

/**
 * Start checkout from a button.
 *
 * Returns an error string rather than throwing so the page can say something
 * useful. The only success path is a redirect to Stripe.
 *
 * The session itself is built in lib/checkout.ts, shared with the page a new
 * account lands on after signing up — the double-billing guard has to be the
 * same code in both places.
 */
export async function startCheckout(): Promise<string | void> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?redirect_url=%2Fplans");

  const result = await createCheckoutSession(viewer);

  if (!result.ok) {
    if (result.reason === "not_configured")
      return "Checkout is not configured yet.";
    if (result.reason === "already_subscribed")
      return "You already have an active subscription.";
    return "Could not start checkout. Please try again.";
  }

  // Outside any try/catch: redirect() signals by throwing, and catching it
  // would turn a successful checkout into an error message.
  redirect(result.url);
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
      return_url: `${getAppUrl()}/account/billing`,
    });
    url = session.url;
  } catch (error) {
    console.error("[stripe] could not open the billing portal:", error);
    return "Could not open billing. Please try again.";
  }

  if (!url) return "Could not open billing. Please try again.";
  redirect(url);
}
