import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Card, CardBody } from "@/components/card";
import { PageShell } from "@/components/page-shell";
import {
  ManageBillingButton,
  SubscribeButton,
} from "@/components/subscribe-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { PLAN } from "@/lib/plan";
import { isStripeConfigured, isStripeTestMode } from "@/lib/stripe";
import { getSubscriptionState } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "Every Roboxing event, live and on demand. Free trial, then one monthly price.",
};

export default async function SubscribePage() {
  const viewer = await getViewer().catch(() => null);

  const { active, until: currentUntil } = viewer
    ? await getSubscriptionState(viewer.id)
    : { active: false, until: null };

  const configured = isStripeConfigured();

  return (
    <PageShell>
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow mb-3">Membership</p>
        <h1 className="font-display text-hero text-ink uppercase">
          Every event. One price.
        </h1>
        <p className="text-ink-muted mt-4 text-sm">
          Live fight nights and every recording afterwards, on any device.
        </p>
      </div>

      <Card className="mx-auto mt-10 max-w-md">
        <CardBody className="text-center">
          <p className="eyebrow">Roboxing</p>

          <p className="font-display text-ink mt-3 text-5xl font-bold">
            <span className="tabular">${PLAN.monthlyPriceUsd}</span>
            <span className="text-ink-dim text-lg font-semibold"> / month</span>
          </p>

          {!active ? (
            <p className="text-volt font-display mt-2 text-sm font-semibold tracking-wide uppercase">
              {PLAN.trialDays} days free
            </p>
          ) : null}

          <ul className="text-ink-muted mt-8 space-y-3 text-left text-sm">
            {[
              "Every live event, in full",
              "Every recording, for as long as you subscribe",
              "Full fight card, results and standings as they happen",
              "Cancel any time — you keep access until the period ends",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <Check className="text-volt mt-0.5 size-4 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {!viewer ? (
              <Button asChild size="lg" className="w-full">
                <Link href="/sign-in?redirect_url=%2Fsubscribe">
                  Create an account
                </Link>
              </Button>
            ) : !configured ? (
              <Button size="lg" className="w-full" disabled>
                Checkout opens with the first licensed event
              </Button>
            ) : active ? (
              <ManageBillingButton />
            ) : (
              <SubscribeButton />
            )}
          </div>

          <p className="text-ink-dim mt-4 text-xs">
            {active
              ? currentUntil
                ? `Your access runs until ${currentUntil.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}.`
                : "Your access is active."
              : !viewer
                ? "An account is free. You will not be charged until there is something to charge for."
                : "Every event on the site is currently free to watch."}
          </p>

          {configured && isStripeTestMode() ? (
            <p className="border-drift/30 bg-drift/10 text-drift mt-4 rounded-md border px-3 py-2 text-xs">
              Stripe is in test mode. Use card 4242 4242 4242 4242 — no real
              money moves.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <p className="text-ink-dim mx-auto mt-8 max-w-md text-center text-xs">
        Roboxing has no broadcast rights agreement in place yet. Everything
        currently on the site is demonstration data and free to watch.
      </p>
    </PageShell>
  );
}
