import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_INTERVAL,
  PLANS,
  annualSavingPercent,
  availablePlans,
  isBillingInterval,
  monthlyEquivalent,
  intervalFromPath,
  priceIdFor,
} from "./plan";

/**
 * The pricing page makes two claims about money: what a plan costs, and how
 * much the annual one saves. Both are computed from the same numbers Stripe
 * charges against, and both are wrong in a way nobody would notice quickly —
 * a stale "Save 16%" next to a changed price is a statement a customer can
 * hold you to.
 */

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("the saving is computed, not written down", () => {
  it("matches the arithmetic on the current prices", () => {
    const twelveMonths = PLANS.month.priceUsd * 12;
    const expected = Math.round(
      ((twelveMonths - PLANS.year.priceUsd) / twelveMonths) * 100,
    );
    expect(annualSavingPercent()).toBe(expected);
  });

  it("is a real saving, not a rounding artefact", () => {
    // If this ever fails, the annual plan costs MORE per month than monthly
    // and the page would be advertising a discount that does not exist.
    expect(PLANS.year.priceUsd).toBeLessThan(PLANS.month.priceUsd * 12);
    expect(annualSavingPercent()).toBeGreaterThan(0);
  });

  it("states the per-month equivalent correctly", () => {
    expect(monthlyEquivalent(PLANS.year)).toBeCloseTo(
      PLANS.year.priceUsd / 12,
      10,
    );
    expect(monthlyEquivalent(PLANS.month)).toBe(PLANS.month.priceUsd);
  });

  it("keeps the annual monthly-equivalent below the monthly price", () => {
    expect(monthlyEquivalent(PLANS.year)).toBeLessThan(PLANS.month.priceUsd);
  });
});

describe("price ids", () => {
  it("reads the plan's own variable", () => {
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_monthly";
    process.env.STRIPE_PRICE_ID_YEARLY = "price_yearly";
    expect(priceIdFor(PLANS.month)).toBe("price_monthly");
    expect(priceIdFor(PLANS.year)).toBe("price_yearly");
  });

  it("falls back to the original single-plan variable for monthly", () => {
    // An environment configured before the annual plan existed must keep
    // selling the monthly plan rather than losing checkout entirely.
    delete process.env.STRIPE_PRICE_ID_MONTHLY;
    delete process.env.STRIPE_PRICE_ID_YEARLY;
    process.env.STRIPE_PRICE_ID = "price_legacy";
    expect(priceIdFor(PLANS.month)).toBe("price_legacy");
  });

  it("does NOT fall back for yearly", () => {
    // The legacy variable holds a MONTHLY price. Using it for the annual plan
    // would charge $9.99 for a year of access.
    delete process.env.STRIPE_PRICE_ID_MONTHLY;
    delete process.env.STRIPE_PRICE_ID_YEARLY;
    process.env.STRIPE_PRICE_ID = "price_legacy";
    expect(priceIdFor(PLANS.year)).toBeNull();
  });
});

describe("availablePlans", () => {
  it("offers only what can actually be bought", () => {
    delete process.env.STRIPE_PRICE_ID_YEARLY;
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_monthly";
    const intervals = availablePlans().map((p) => p.interval);
    expect(intervals).toEqual(["month"]);
  });

  it("offers both when both exist", () => {
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_monthly";
    process.env.STRIPE_PRICE_ID_YEARLY = "price_yearly";
    expect(availablePlans()).toHaveLength(2);
  });

  it("offers nothing when Stripe is not set up, rather than a broken button", () => {
    delete process.env.STRIPE_PRICE_ID_MONTHLY;
    delete process.env.STRIPE_PRICE_ID_YEARLY;
    delete process.env.STRIPE_PRICE_ID;
    expect(availablePlans()).toEqual([]);
  });
});

describe("interval parsing", () => {
  it.each(["month", "year"])("accepts %s", (value) => {
    expect(isBillingInterval(value)).toBe(true);
  });

  it.each([["monthly"], ["YEAR"], [""], [null], [undefined], [7], [{}]])(
    "rejects %s",
    (value) => {
      expect(isBillingInterval(value)).toBe(false);
    },
  );

  it("has a default that is itself a valid interval", () => {
    expect(isBillingInterval(DEFAULT_INTERVAL)).toBe(true);
  });
});

describe("reading the chosen plan back out of a destination", () => {
  it("finds it in the checkout path", () => {
    expect(intervalFromPath("/subscribe/checkout?plan=year")).toBe("year");
    expect(intervalFromPath("/subscribe/checkout?plan=month")).toBe("month");
  });

  it("survives other parameters around it", () => {
    expect(intervalFromPath("/subscribe/checkout?a=1&plan=year&b=2")).toBe(
      "year",
    );
  });

  it.each([
    ["no query at all", "/subscribe/checkout"],
    ["a different parameter", "/subscribe/checkout?tier=year"],
    ["an unknown value", "/subscribe/checkout?plan=forever"],
    ["an empty value", "/subscribe/checkout?plan="],
    ["a bare path", "/"],
    ["null", null],
    ["undefined", undefined],
  ])("returns null for %s", (_label, path) => {
    // Null rather than a default: a summary naming the wrong plan is worse
    // than no summary, because the customer would only notice on the receipt.
    expect(intervalFromPath(path)).toBeNull();
  });
});
