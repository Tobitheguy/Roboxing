import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Card, CardBody } from "@/components/card";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { PLAN } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "Every Roboxing event, live and on demand. Free trial, then one monthly price.",
};

/**
 * The plan.
 *
 * Checkout is not wired yet — Stripe comes once there are broadcast rights and
 * therefore something to sell. The page exists now because the paywall already
 * links here, and a call to action that leads nowhere is worse than no call to
 * action at all.
 */
export default async function SubscribePage() {
  const viewer = await getViewer().catch(() => null);

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

          <p className="text-volt font-display mt-2 text-sm font-semibold tracking-wide uppercase">
            {PLAN.trialDays} days free
          </p>

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
            {viewer ? (
              <Button size="lg" className="w-full" disabled>
                Checkout opens with the first licensed event
              </Button>
            ) : (
              <Button asChild size="lg" className="w-full">
                <Link href="/sign-in">Create an account</Link>
              </Button>
            )}
          </div>

          <p className="text-ink-dim mt-4 text-xs">
            {viewer
              ? "Nothing to pay yet — every event on the site is currently free to watch."
              : "An account is free. You will not be charged until there is something to charge for."}
          </p>
        </CardBody>
      </Card>

      <p className="text-ink-dim mx-auto mt-8 max-w-md text-center text-xs">
        Roboxing has no broadcast rights agreement in place yet. Everything
        currently on the site is demonstration data and free to watch.
      </p>
    </PageShell>
  );
}
