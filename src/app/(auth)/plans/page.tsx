import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { getViewer } from "@/lib/auth";
import {
  DEFAULT_INTERVAL,
  PLANS,
  TRIAL_DAYS,
  annualSavingPercent,
  availablePlans,
  isBillingInterval,
  monthlyEquivalent,
  type BillingInterval,
} from "@/lib/plan";
import { isStripeConfigured, isStripeTestMode } from "@/lib/stripe";
import { getSubscriptionState } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Choose your plan",
  description:
    "Every Roboxing event live and on demand. 14 days free, then monthly or yearly.",
  robots: { index: false, follow: false },
};

const INCLUDED = [
  "Every live event, in full",
  "Every recording, for as long as you subscribe",
  "Standings, rosters and full fight history",
  "Cancel any time — access runs to the end of the period",
];

/**
 * Plan selection, BEFORE the account exists.
 *
 * This is the order HBO Max, Hulu, DAZN and FOX One all use, and the reason is
 * commitment rather than convenience: someone who has picked a plan has
 * already decided to buy, and finishes the form. Someone who creates an
 * account first has been asked for effort before being told the price, and a
 * price revealed after work feels like a catch.
 *
 * It sits in `(auth)`, outside the gate, because it has to be readable by
 * someone with no account — that is the entire point of putting it first.
 *
 * The interval lives in the URL rather than in component state, which makes
 * the whole page a server component: no client bundle for what is two links,
 * the choice survives a refresh, and it can be linked to directly.
 */
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const interval: BillingInterval = isBillingInterval(raw)
    ? raw
    : DEFAULT_INTERVAL;

  const viewer = await getViewer().catch(() => null);
  const { active } = viewer
    ? await getSubscriptionState(viewer.id)
    : { active: false };

  const configured = isStripeConfigured();
  const offered = availablePlans();
  const plan = PLANS[interval];
  const saving = annualSavingPercent();

  // Only offer a switcher when there is something to switch between. A tab bar
  // with one tab is a control that does nothing.
  const showSwitcher = offered.length > 1;
  const sellable = offered.some((p) => p.interval === interval);

  const destination = !viewer
    ? `/sign-up?redirect_url=${encodeURIComponent(`/subscribe/checkout?plan=${interval}`)}`
    : active
      ? "/account/billing"
      : `/subscribe/checkout?plan=${interval}`;

  const perMonth = monthlyEquivalent(plan);

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

      {showSwitcher ? (
        <div
          role="tablist"
          aria-label="Billing period"
          className="border-line bg-surface mt-8 flex rounded-lg border p-1"
        >
          {offered.map((option) => {
            const selected = option.interval === interval;
            return (
              <Link
                key={option.interval}
                href={`/plans?plan=${option.interval}`}
                role="tab"
                aria-selected={selected}
                replace
                scroll={false}
                className={cn(
                  "focus-visible:ring-volt flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  selected
                    ? "bg-volt text-volt-ink"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {option.label}
                {option.interval === "year" && saving > 0 ? (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase",
                      selected
                        ? "bg-volt-ink/15 text-volt-ink"
                        : "bg-volt/15 text-volt",
                    )}
                  >
                    Save {saving}%
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="border-volt bg-surface relative mt-4 rounded-lg border-2 p-6">
        {interval === "year" && saving > 0 ? (
          <span className="bg-volt text-volt-ink font-display absolute -top-3 left-6 rounded px-2 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase">
            Best value
          </span>
        ) : null}

        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="font-display text-ink text-lg font-semibold uppercase">
              Roboxing
            </p>
            <p className="text-volt font-display mt-1 text-xs font-semibold tracking-wide uppercase">
              {TRIAL_DAYS} days free
            </p>
          </div>
          <p className="font-display text-ink text-right text-3xl font-bold">
            <span className="tabular">${plan.priceUsd}</span>
            <span className="text-ink-dim block text-xs font-semibold">
              per {plan.interval}
            </span>
          </p>
        </div>

        {/* The per-month figure is what makes an annual price comparable. It is
            computed from the same number Stripe charges, never written down. */}
        {plan.interval === "year" ? (
          <p className="text-ink-muted mt-4 text-sm">
            Works out at{" "}
            <span className="text-ink font-semibold">
              ${perMonth.toFixed(2)}
            </span>{" "}
            a month — ${(PLANS.month.priceUsd * 12 - plan.priceUsd).toFixed(2)}{" "}
            less than paying monthly for a year.
          </p>
        ) : null}

        <ul className="text-ink-muted mt-6 space-y-3 text-sm">
          {INCLUDED.map((line) => (
            <li key={line} className="flex items-start gap-3">
              <Check className="text-volt mt-0.5 size-4 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {configured && sellable ? (
        <Link
          href={destination}
          className="bg-volt text-volt-ink hover:bg-volt-dim focus-visible:ring-volt mt-6 flex h-12 w-full items-center justify-center rounded-md text-sm font-semibold tracking-wide uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0f] focus-visible:outline-none"
        >
          {active ? "Manage your subscription" : "Start free trial"}
        </Link>
      ) : (
        <p className="border-line bg-surface text-ink-muted mt-6 rounded-md border p-4 text-center text-sm">
          {configured
            ? "This plan is not available yet."
            : "Checkout is not configured yet."}
        </p>
      )}

      {/* Stated before the card is asked for, not after. Every clause here is a
          real term of the subscription being sold. */}
      <p className="text-ink-dim mt-4 text-center text-xs leading-relaxed">
        Your card is saved now and charged ${plan.priceUsd} when the{" "}
        {TRIAL_DAYS}-day trial ends, then every {plan.interval}. Cancel any time
        before then and you are not charged at all.
      </p>

      {configured && isStripeTestMode() ? (
        <p className="border-drift/30 bg-drift/10 text-drift mt-4 rounded-md border px-3 py-2 text-center text-xs">
          Test mode. Use card 4242 4242 4242 4242 with any future expiry and any
          CVC — no real money moves.
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
