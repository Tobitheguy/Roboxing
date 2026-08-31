import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Card, CardBody } from "@/components/card";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "You're in",
  robots: { index: false, follow: false },
};

/**
 * Post-checkout confirmation.
 *
 * Deliberately does NOT grant anything or read the session to decide access.
 * The webhook does that, and it has to: a customer who closes the tab the
 * moment their card is charged never reaches this page, and they have still
 * paid. This page only says thank you.
 */
export default function SubscribeSuccessPage() {
  return (
    <PageShell>
      <Card className="mx-auto max-w-md">
        <CardBody className="text-center">
          <CheckCircle2 className="text-volt mx-auto size-10" />
          <h1 className="font-display text-title text-ink mt-4 uppercase">
            You&apos;re in
          </h1>
          <p className="text-ink-muted mt-3 text-sm">
            Your subscription is being confirmed with Stripe. Access usually
            appears within a few seconds — if it takes longer, reload the page.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button asChild size="lg">
              <Link href="/schedule">See what&apos;s on</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/subscribe">Manage subscription</Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    </PageShell>
  );
}
