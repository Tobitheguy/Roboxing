/**
 * The subscription plan.
 *
 * Defined once here rather than typed into the pricing page, so the number a
 * visitor is shown and the number Stripe charges cannot drift apart. When
 * checkout is wired, the Stripe price is created from these values and its id
 * is stored alongside — not the other way round.
 */
export const PLAN = {
  monthlyPriceUsd: 9.99,
  currency: "usd",

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
  trialDays: 14,
} as const;
