import Link from "next/link";

import {
  PLANS,
  TRIAL_DAYS,
  monthlyEquivalent,
  type BillingInterval,
} from "@/lib/plan";

/**
 * A one-line reminder of what was chosen on the previous screen.
 *
 * Without it, step 2 asks for an email and a password with no visible
 * connection to the plan just picked, and the price disappears at exactly the
 * moment someone is deciding whether to hand over an address. The "Change"
 * link matters as much as the summary: a funnel with no way back is a trap,
 * and people who cannot go back leave instead.
 */
export function ChosenPlan({ interval }: { interval: BillingInterval }) {
  const plan = PLANS[interval];
  const perMonth = monthlyEquivalent(plan);

  return (
    <div className="border-line bg-surface flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0">
        <p className="text-eyebrow text-ink-dim uppercase">Your plan</p>
        <p className="font-display text-ink mt-1 truncate text-sm font-semibold uppercase">
          Roboxing {plan.label}
        </p>
        <p className="text-ink-muted mt-0.5 text-xs">
          {TRIAL_DAYS} days free, then ${plan.priceUsd} per {plan.interval}
          {plan.interval === "year" ? ` — $${perMonth.toFixed(2)} a month` : ""}
        </p>
      </div>
      <Link
        href={`/plans?plan=${interval}`}
        className="text-volt hover:text-volt-dim focus-visible:ring-volt shrink-0 rounded-sm text-xs font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
      >
        Change
      </Link>
    </div>
  );
}
