import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { getViewer } from "@/lib/auth";
import { PLAN } from "@/lib/plan";
import { isStripeConfigured, isStripeTestMode } from "@/lib/stripe";
import { getSubscriptionState } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Choose your plan",
  description:
    "Every Roboxing event live and on demand. 14 days free, then $9.99 a month.",
  robots: { index: false, follow: false },
};

/**
 * Plan selection, BEFORE the account exists.
 *
 * This is the order HBO Max, Hulu and FOX One all use, and the reason is
 * commitment rather than convenience: someone who has picked a plan has
 * already decided to buy, and finishes the form. Someone who creates an
 * account first has been asked for effort before being told the price, and a
 * price revealed after work feels like a catch.
 *
 * It sits in `(auth)`, outside the gate, because it has to be readable by
 * someone with no account — that is the entire point of putting it first.
 *
 * There is one plan today. This page is still worth having as its own step:
 * it is where the price, the trial and the billing terms are stated before
 * anyone types anything, and a second plan drops in without moving the flow.
 */
export default async function PlansPage() {
  // Never throws the page away over auth trouble: a signed-out visitor is the
  // expected case here, and an error resolving one should look the same.
  const viewer = await getViewer().catch(() => null);
  const { active } = viewer
    ? await getSubscriptionState(viewer.id)
    : { active: false };

  const configured = isStripeConfigured();

  // Where the button goes, decided once. Signed out, the destination is
  // carried THROUGH sign-up so nobody has to find their way back here.
  const destination = !viewer
    ? `/sign-up?redirect_url=${encodeURIComponent("/subscribe/checkout")}`
    : active
      ? "/account/billing"
      : "/subscribe/checkout";

  const label = active ? "Manage your subscription" : "Start free trial";

  return (
    <div className="w-full max-w-md">
      <div className="text-center">
        <p className="text-eyebrow text-volt font-semibold uppercase">
          Step 1 of 2
        </p>
        <h1 className="font-display text-hero text-ink mt-3 uppercase">
          Choose your plan
        </h1>
        <p className="text-ink-muted mt-3 text-sm">
          Start free. You will not be charged until the trial ends.
        </p>
      </div>

      <div className="border-volt bg-surface mt-8 rounded-lg border-2 p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="font-display text-ink text-lg font-semibold uppercase">
              Roboxing
            </p>
            <p className="text-volt font-display mt-1 text-xs font-semibold tracking-wide uppercase">
              {PLAN.trialDays} days free
            </p>
          </div>
          <p className="font-display text-ink text-right text-3xl font-bold">
            <span className="tabular">${PLAN.monthlyPriceUsd}</span>
            <span className="text-ink-dim block text-xs font-semibold">
              per month
            </span>
          </p>
        </div>

        <ul className="text-ink-muted mt-6 space-y-3 text-sm">
          {[
            "Every live event, in full",
            "Every recording, for as long as you subscribe",
            "Standings, rosters and full fight history",
            "Cancel any time — access runs to the end of the period",
          ].map((line) => (
            <li key={line} className="flex items-start gap-3">
              <Check className="text-volt mt-0.5 size-4 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {configured ? (
        <Link
          href={destination}
          className="bg-volt text-volt-ink hover:bg-volt-dim focus-visible:ring-volt mt-6 flex h-12 w-full items-center justify-center rounded-md text-sm font-semibold tracking-wide uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0f] focus-visible:outline-none"
        >
          {label}
        </Link>
      ) : (
        <p className="border-line bg-surface text-ink-muted mt-6 rounded-md border p-4 text-center text-sm">
          Checkout is not configured yet.
        </p>
      )}

      {/* Said before the card is asked for, not after. Everything on this line
          is a real term of the subscription being sold. */}
      <p className="text-ink-dim mt-4 text-center text-xs leading-relaxed">
        Your card is saved now and charged ${PLAN.monthlyPriceUsd} when the{" "}
        {PLAN.trialDays}-day trial ends, then monthly. Cancel any time before
        then and you are not charged at all.
      </p>

      {configured && isStripeTestMode() ? (
        <p className="border-drift/30 bg-drift/10 text-drift mt-4 rounded-md border px-3 py-2 text-center text-xs">
          Test mode. Use card 4242 4242 4242 4242 with any future expiry and
          any CVC — no real money moves.
        </p>
      ) : null}

      {!viewer ? (
        <p className="text-ink-dim mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-volt font-semibold underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      ) : null}
    </div>
  );
}
