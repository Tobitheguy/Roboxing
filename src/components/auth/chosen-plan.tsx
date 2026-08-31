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
 * link matters as much as the summary: a funnel with no way back is a trap.
 *
 * Kept to a single row. It used to be a three-line block, which on a phone
 * pushed the form itself below the fold — the summary is context, not the
 * point of the screen, and context that displaces the task is a cost.
 */
export function ChosenPlan({ interval }: { interval: BillingInterval }) {
  const plan = PLANS[interval];
  const perMonth = monthlyEquivalent(plan);

  return (
    <div className="border-line bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm">
      <p className="min-w-0 truncate">
        <span className="font-display text-ink font-semibold uppercase">
          {plan.label}
        </span>
        <span className="text-ink-muted">
          {" — "}
          {TRIAL_DAYS} days free, then ${plan.priceUsd}/{plan.interval}
          {plan.interval === "year" ? ` ($${perMonth.toFixed(2)}/mo)` : ""}
        </span>
      </p>
      <Link
        href={`/plans?plan=${interval}`}
        className="text-volt hover:text-volt-dim focus-visible:ring-volt shrink-0 rounded-sm text-xs font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
      >
        Change
      </Link>
    </div>
  );
}
