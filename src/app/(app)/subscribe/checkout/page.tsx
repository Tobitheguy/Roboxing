import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireVerifiedViewer } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/checkout";
import { DEFAULT_INTERVAL, isBillingInterval } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

/**
 * Step 2: hand off to Stripe's payment form.
 *
 * A new account lands here immediately after signing up, which is what makes
 * the flow feel like Hulu's — plan, account, card, done — rather than
 * depositing someone in an app and hoping they find the subscribe button.
 *
 * The session is created on a GET, which deserves a note. A refresh creates a
 * second Checkout Session, and that is harmless: sessions are inert until
 * completed, expire on their own, and cost nothing. What a refresh must NOT do
 * is create a second SUBSCRIPTION — and it cannot, because
 * createCheckoutSession() refuses when one is already active.
 *
 * Rendering only happens when the redirect does not: if Stripe is unreachable
 * or misconfigured, this page says so instead of leaving a blank screen at the
 * exact moment someone was trying to pay.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  // An unrecognised value falls back to the monthly plan rather than failing.
  // It cannot select a plan that does not exist: the interval is validated
  // here, and the price id is looked up from it rather than taken from input.
  const interval = isBillingInterval(raw) ? raw : DEFAULT_INTERVAL;

  const viewer = await requireVerifiedViewer(
    `/subscribe/checkout?plan=${interval}`,
  );
  const result = await createCheckoutSession(viewer, interval);

  if (result.ok) {
    // Outside a try/catch on purpose: redirect() signals by throwing.
    redirect(result.url);
  }

  if (result.reason === "already_subscribed") {
    redirect("/account/billing");
  }

  const message =
    result.reason === "not_configured"
      ? "Checkout is not available yet. Nothing has been charged."
      : "We could not reach the payment provider. Nothing has been charged.";

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-title text-ink uppercase">
        Payment could not start
      </h1>
      <p className="text-ink-muted mt-4 text-sm leading-relaxed">{message}</p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/plans"
          className="bg-volt text-volt-ink hover:bg-volt-dim flex h-11 items-center justify-center rounded-md text-sm font-semibold"
        >
          Try again
        </Link>
        <Link
          href="/"
          className="border-line text-ink hover:bg-surface-2 flex h-11 items-center justify-center rounded-md border text-sm font-medium"
        >
          Continue without subscribing
        </Link>
      </div>
    </div>
  );
}
