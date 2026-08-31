import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";

import { Card, CardBody, CardHeader } from "@/components/card";
import { PageShell } from "@/components/page-shell";
import { ManageBillingButton } from "@/components/subscribe-button";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireVerifiedViewer } from "@/lib/auth";
import { formatAmount, formatDay, getBillingSummary } from "@/lib/billing";
import { PLAN } from "@/lib/plan";
import { isStripeConfigured, isStripeTestMode } from "@/lib/stripe";
import { getSubscriptionState } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

/**
 * What the subscriber is paying, when, and how to stop.
 *
 * Two sources, deliberately, and the page is honest about which is which:
 *
 *   - ACCESS comes from our entitlements table. It is what the paywall reads,
 *     so it is what the page states about watching.
 *   - BILLING comes from Stripe. Trial end, next charge, card on file and
 *     whether a cancellation is already scheduled exist only there.
 *
 * When Stripe cannot be reached the billing half is missing and says so. It
 * does not fall back to guessing from the entitlement window — "your next
 * charge is probably then" is worse than no answer.
 *
 * Cancelling is not built here. It goes to Stripe's own portal, because a
 * home-made cancel button would have to reimplement proration, dunning and
 * invoice history, and every one of those is a chargeback when it is wrong.
 */
export default async function BillingPage() {
  const viewer = await requireVerifiedViewer("/account/billing");

  const [row] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, viewer.id))
    .limit(1);

  const [{ active, until }, billing] = await Promise.all([
    getSubscriptionState(viewer.id),
    getBillingSummary(row?.stripeCustomerId ?? null),
  ]);

  const configured = isStripeConfigured();
  const trialing = billing?.status === "trialing";

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow mb-3">Account</p>
        <h1 className="font-display text-hero text-ink uppercase">Billing</h1>
        <p className="text-ink-muted mt-3 text-sm">
          Signed in as {viewer.email}
        </p>

        {/* -------------------------------------------------------------- */}
        <Card className="mt-8">
          <CardHeader title="Access" />
          <CardBody>
            {active ? (
              <>
                <p className="text-ink text-sm">
                  <span className="text-volt font-display font-semibold uppercase">
                    Active
                  </span>{" "}
                  — you can watch everything, including the archive.
                </p>
                {until ? (
                  <p className="text-ink-muted mt-2 text-sm">
                    {billing?.cancelAtPeriodEnd
                      ? `Cancelled. Access ends ${formatDay(until)}.`
                      : `Access runs to ${formatDay(until)} and renews automatically.`}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-ink-muted text-sm">
                  You do not have an active subscription.
                </p>
                <p className="text-ink-dim mt-2 text-sm">
                  Every event on the site is currently free to watch, so nothing
                  is locked. That changes when the first licensed event lands.
                </p>
                <Link
                  href="/plans"
                  className="bg-volt text-volt-ink hover:bg-volt-dim mt-5 inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-semibold"
                >
                  See plans
                </Link>
              </>
            )}
          </CardBody>
        </Card>

        {/* -------------------------------------------------------------- */}
        {billing ? (
          <Card className="mt-6">
            <CardHeader title="Subscription" />
            <CardBody>
              <dl className="divide-line divide-y text-sm">
                <Row label="Plan">
                  Roboxing
                  {billing.amountCents !== null && billing.interval
                    ? ` — ${formatAmount(billing.amountCents, billing.currency)} per ${billing.interval}`
                    : ""}
                </Row>

                <Row label="Status">
                  <span className="capitalize">
                    {billing.status.replace(/_/g, " ")}
                  </span>
                </Row>

                {trialing && billing.trialEndsAt ? (
                  <Row label="Free trial ends">
                    {formatDay(billing.trialEndsAt)}
                    {billing.amountCents !== null ? (
                      <span className="text-ink-dim">
                        {" "}
                        — first charge of{" "}
                        {formatAmount(billing.amountCents, billing.currency)} on
                        that day
                      </span>
                    ) : null}
                  </Row>
                ) : null}

                {billing.periodEndsAt ? (
                  <Row
                    label={
                      billing.cancelAtPeriodEnd
                        ? "Access ends"
                        : trialing
                          ? "First billing date"
                          : "Next payment"
                    }
                  >
                    {formatDay(billing.periodEndsAt)}
                  </Row>
                ) : null}

                <Row label="Payment method">
                  {billing.card ? (
                    <>
                      <span className="capitalize">{billing.card.brand}</span>{" "}
                      ending {billing.card.last4}
                    </>
                  ) : (
                    <span className="text-ink-dim">
                      Not shown here — open billing to see or change it
                    </span>
                  )}
                </Row>
              </dl>

              {billing.cancelAtPeriodEnd ? (
                <p className="border-drift/30 bg-drift/10 text-drift mt-5 rounded-md border px-3 py-2 text-xs">
                  This subscription is set to cancel. You keep access until the
                  date above and will not be charged again.
                </p>
              ) : null}

              <div className="mt-6">
                <ManageBillingButton />
              </div>
              <p className="text-ink-dim mt-3 text-xs">
                Opens Stripe, where you can change your card, download invoices
                or cancel.
              </p>
            </CardBody>
          </Card>
        ) : configured && row?.stripeCustomerId ? (
          <Card className="mt-6">
            <CardHeader title="Subscription" />
            <CardBody>
              <p className="text-ink-muted text-sm leading-relaxed">
                Billing details could not be loaded right now. Your access above
                is unaffected — it is read from our own records, not from this
                request.
              </p>
              <div className="mt-5">
                <ManageBillingButton />
              </div>
            </CardBody>
          </Card>
        ) : null}

        {configured && isStripeTestMode() ? (
          <p className="border-drift/30 bg-drift/10 text-drift mt-6 rounded-md border px-3 py-2 text-xs">
            Stripe is in test mode. Nothing on this page involves real money,
            and any card shown is a test card.
          </p>
        ) : null}

        <p className="text-ink-dim mt-6 text-xs leading-relaxed">
          Roboxing bills ${PLAN.monthlyPriceUsd} per month after a{" "}
          {PLAN.trialDays}-day free trial. Cancelling stops the next renewal;
          access continues to the end of the period already paid for.
        </p>
      </div>
    </PageShell>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink text-right">{children}</dd>
    </div>
  );
}
