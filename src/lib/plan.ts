/**
 * The subscription plans.
 *
 * Defined once here rather than typed into the pricing pages, so the number a
 * visitor is shown and the number Stripe charges cannot drift apart. The
 * Stripe prices are created FROM these values; their ids come back in
 * environment variables and are looked up by interval, never hard-coded next
 * to a second copy of the price.
 */

export type BillingInterval = "month" | "year";

export type Plan = {
  interval: BillingInterval;
  /** What Stripe charges per billing period, in dollars. */
  priceUsd: number;
  /** Which environment variable carries the Stripe price id. */
  priceIdEnv: string;
  label: string;
};

/**
 * 14 days rather than 7, for a reason specific to this product: the thing
 * being sold is an EVENT, and the calendar is irregular. A seven-day trial
 * will frequently contain no fight night at all, which means the trialist
 * sees nothing worth keeping and cancels by default. Fourteen days roughly
 * doubles the chance a trial overlaps a card.
 *
 * The extra week costs almost nothing: delivery for one viewer watching a
 * two-hour event is a few cents.
 */
export const TRIAL_DAYS = 14;

export const CURRENCY = "usd";

export const PLANS: Record<BillingInterval, Plan> = {
  month: {
    interval: "month",
    priceUsd: 9.99,
    // Falls back to the original single-plan variable so an environment set up
    // before the annual plan existed keeps working rather than losing checkout.
    priceIdEnv: "STRIPE_PRICE_ID_MONTHLY",
    label: "Monthly",
  },
  year: {
    interval: "year",
    // 99.99 against 119.88 for twelve monthly payments: $8.33 a month, a
    // saving of 16%. Chosen to sit where every comparable service sits —
    // enough to move people onto the annual plan, not so much that the monthly
    // price looks like a punishment.
    //
    // The commercial reason is specific to this product. Roboxing's calendar
    // is irregular, so a monthly subscriber's default behaviour is to cancel
    // after an event and resubscribe for the next one. An annual plan is the
    // standard answer to exactly that, and it is why this exists before any
    // ad-supported tier does.
    priceUsd: 99.99,
    priceIdEnv: "STRIPE_PRICE_ID_YEARLY",
    label: "Yearly",
  },
};

/** The one offered by default, and the one a bare /plans link lands on. */
export const DEFAULT_INTERVAL: BillingInterval = "month";

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year";
}

/**
 * The Stripe price id for a plan, or null when it has not been created yet.
 *
 * Null rather than a throw: an environment with only the monthly price
 * configured should still sell the monthly plan. Hiding the annual option is a
 * degraded page; a crash is a lost customer.
 */
export function priceIdFor(plan: Plan): string | null {
  const direct = process.env[plan.priceIdEnv];
  if (direct) return direct;
  if (plan.interval === "month") return process.env.STRIPE_PRICE_ID ?? null;
  return null;
}

/** Which plans can actually be bought right now. */
export function availablePlans(): Plan[] {
  return Object.values(PLANS).filter((plan) => priceIdFor(plan) !== null);
}

/** Monthly equivalent of a plan, for the "$8.33/month" line. */
export function monthlyEquivalent(plan: Plan): number {
  return plan.interval === "year" ? plan.priceUsd / 12 : plan.priceUsd;
}

/**
 * How much the annual plan saves against paying monthly for a year, as a
 * whole percent. Computed, never written down — a hard-coded "Save 16%" is
 * wrong the moment either price moves, and it is a claim about money.
 */
export function annualSavingPercent(): number {
  const twelveMonths = PLANS.month.priceUsd * 12;
  if (twelveMonths <= 0) return 0;
  return Math.round(((twelveMonths - PLANS.year.priceUsd) / twelveMonths) * 100);
}

/**
 * Kept so existing imports of PLAN keep meaning what they meant: the monthly
 * price and the trial length.
 */
export const PLAN = {
  monthlyPriceUsd: PLANS.month.priceUsd,
  currency: CURRENCY,
  trialDays: TRIAL_DAYS,
} as const;
