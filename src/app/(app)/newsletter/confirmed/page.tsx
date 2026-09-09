import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Subscription confirmed",
  // Not indexable: it is the landing spot for a one-off click from an email,
  // it says nothing to a stranger, and a search result promising "subscription
  // confirmed" to someone who never subscribed is worse than no result.
  robots: { index: false, follow: false },
};

/**
 * Where the confirmation link lands.
 *
 * The `ok=0` case is a token that matched nothing — expired, mistyped, or
 * already-rotated. It is worth naming rather than pretending success, because
 * the person is left believing they are on a list they are not on, and the
 * next thing they notice is that nothing ever arrives.
 */
export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const failed = ok === "0";

  return (
    <PageShell>
      <PageHeading
        eyebrow="Newsletter"
        title={failed ? "That link did not work" : "You're on the list"}
      />
      <Card>
        {failed ? (
          <EmptyState
            icon={<CircleAlert />}
            title="This confirmation link is not valid"
            description="It may have already been used, or the address was removed. Enter your address again in the footer and we will send a fresh link."
          />
        ) : (
          <EmptyState
            icon={<CheckCircle2 />}
            title="Confirmed"
            description="We'll mail you when a result lands or an event is close. Every mail has a one-click unsubscribe."
          />
        )}
        <p className="px-6 pb-6 text-center text-sm">
          <Link href="/" className="text-ink underline">
            Back to Roboxing
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}
