import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { syncSubscriptionEntitlement } from "@/lib/subscriptions";

/**
 * Stripe webhook.
 *
 * THE SOURCE OF TRUTH for who may watch. Access is never granted on the
 * redirect back from checkout: a customer can close the tab the instant their
 * card is charged, and granting on the redirect means someone who paid cannot
 * watch — the worst failure this system has.
 *
 * The signature check is not optional. Without it this endpoint is a public
 * form for granting yourself a subscription, and it is trivially discoverable
 * on a public repo.
 */

/** Events that change whether, or for how long, someone is entitled. */
const HANDLED: string[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The RAW body is required — any parsing or re-serialising changes the bytes
  // and the signature will not verify.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("[stripe] signature verification failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!HANDLED.includes(event.type)) {
    // Acknowledged so Stripe stops retrying something we deliberately ignore.
    return Response.json({ received: true, handled: false });
  }

  try {
    const subscriptionId = subscriptionIdFrom(event);
    if (!subscriptionId) {
      return Response.json({ received: true, handled: false });
    }

    // Always re-read from Stripe rather than trusting the event payload.
    // Webhooks arrive out of order, so an older event can land after a newer
    // one; fetching gives the current state regardless of delivery order.
    const subscription =
      await stripe().subscriptions.retrieve(subscriptionId);

    const result = await syncSubscriptionEntitlement(subscription);

    // A missing local user means our own write has not landed yet. A 500 makes
    // Stripe redeliver, which is precisely the right recovery.
    if (!result.userId) {
      return new Response("User not ready; retry", { status: 500 });
    }

    return Response.json({ received: true, granted: result.granted });
  } catch (error) {
    console.error(`[stripe] failed handling ${event.type}:`, error);
    // Non-2xx asks Stripe to retry with backoff. Swallowing the error would
    // silently drop a payment.
    return new Response("Handler failed", { status: 500 });
  }
}

function subscriptionIdFrom(event: Stripe.Event): string | null {
  // The union of every Stripe object is too wide to index directly; the
  // shape is narrowed by the event type checks below.
  const object = event.data.object as unknown as Record<string, unknown>;

  if (event.type.startsWith("customer.subscription.")) {
    return (object.id as string) ?? null;
  }

  // checkout.session.completed and invoice.* both carry a subscription
  // reference that may be an id or an expanded object.
  const subscription = object.subscription ?? object.parent;
  if (typeof subscription === "string") return subscription;
  if (subscription && typeof subscription === "object") {
    const nested = subscription as Record<string, unknown>;
    if (typeof nested.id === "string") return nested.id;
    const details = nested.subscription_details as
      | Record<string, unknown>
      | undefined;
    const fromDetails = details?.subscription;
    if (typeof fromDetails === "string") return fromDetails;
  }
  return null;
}
