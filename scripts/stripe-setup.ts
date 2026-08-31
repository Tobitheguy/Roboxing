import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import Stripe from "stripe";

import { PLAN } from "../src/lib/plan";
import {
  describeStripeKey,
  isLiveStripeKey,
  isValidStripeKeyShape,
} from "../src/lib/stripe-key";

/**
 * Create the Roboxing product and its recurring price in Stripe.
 *
 * Run once per Stripe environment (test, then live). Idempotent: it looks for
 * a product it created earlier and reuses it, so running twice does not leave
 * two products with the same name and no way to tell which one customers are
 * actually on.
 *
 * The price is created FROM src/lib/plan.ts, not typed in twice — the number
 * on the pricing page and the number Stripe charges have to be the same one.
 *
 *   npm run stripe:setup
 */

/** Marks the product as ours, so a rerun finds it rather than duplicating it. */
const PRODUCT_KEY = "roboxing_subscription";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "STRIPE_SECRET_KEY is not set.\n\n" +
        "Get it from the Stripe dashboard under Developers -> API keys, then\n" +
        "add it in the Vercel project settings and run `vercel env pull`.",
    );
    process.exit(1);
  }

  // Refuse a key we cannot identify rather than guessing at its mode. Guessing
  // wrong in the reassuring direction means creating live objects while the
  // console says TEST.
  if (!isValidStripeKeyShape(key)) {
    console.error(
      "STRIPE_SECRET_KEY does not look like a Stripe secret key.\n" +
        "Expected it to start with sk_test_, sk_live_, rk_test_ or rk_live_.\n" +
        "A publishable key (pk_…) will not work here — it cannot write.",
    );
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  console.log(`Stripe mode: ${describeStripeKey(key)}\n`);

  if (isLiveStripeKey(key)) {
    console.log(
      "This is a LIVE key. The product and price created here are the ones\n" +
        "real customers will be charged against. Ctrl-C now if that is not\n" +
        "what you meant.\n",
    );
  }

  const existing = await stripe.products.search({
    query: `metadata['key']:'${PRODUCT_KEY}'`,
  });

  const product =
    existing.data[0] ??
    (await stripe.products.create({
      name: "Roboxing",
      description:
        "Every Roboxing event, live and on demand, for as long as you subscribe.",
      metadata: { key: PRODUCT_KEY },
    }));

  console.log(
    existing.data[0]
      ? `Reusing product ${product.id}`
      : `Created product ${product.id}`,
  );

  const unitAmount = Math.round(PLAN.monthlyPriceUsd * 100);

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  const match = prices.data.find(
    (p) =>
      p.unit_amount === unitAmount &&
      p.currency === PLAN.currency &&
      p.recurring?.interval === "month",
  );

  const price =
    match ??
    (await stripe.prices.create({
      product: product.id,
      unit_amount: unitAmount,
      currency: PLAN.currency,
      recurring: { interval: "month" },
    }));

  console.log(match ? `Reusing price ${price.id}` : `Created price ${price.id}`);

  console.log("\n────────────────────────────────────────────────────────");
  console.log("Add this to the Vercel project settings:\n");
  console.log(`STRIPE_PRICE_ID=${price.id}`);
  console.log("\n────────────────────────────────────────────────────────");
  console.log(
    `Plan: $${PLAN.monthlyPriceUsd}/month after ${PLAN.trialDays} days free.\n` +
      "The trial is applied at checkout, not on the price, so changing\n" +
      "PLAN.trialDays takes effect for new subscribers without touching Stripe.",
  );

  if (!isLiveStripeKey(key)) {
    console.log(
      "\nThese are TEST objects. Rerun with a live key before taking real money.",
    );
  }
}

main().catch((error: unknown) => {
  // A restricted key that is missing a permission fails here with a message
  // about the API call, not about the key — which sends you looking in the
  // wrong place. Say what to grant instead.
  const type = (error as { type?: string } | null)?.type;
  if (type === "StripePermissionError") {
    console.error(
      "Stripe refused the call because this restricted key lacks a permission.\n\n" +
        "This script needs, under the key's permissions:\n" +
        "  Products    Write\n" +
        "  Prices      Write\n\n" +
        "The app itself additionally needs:\n" +
        "  Customers               Write\n" +
        "  Checkout Sessions       Write\n" +
        "  Billing Portal Sessions Write\n" +
        "  Subscriptions           Read\n\n" +
        "Edit the key at https://dashboard.stripe.com/test/apikeys\n",
    );
  }
  console.error(error);
  process.exit(1);
});
