import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, MailX } from "lucide-react";

import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
};

/**
 * Where the unsubscribe link lands.
 *
 * Says the thing plainly and offers no "are you sure?", no survey and no
 * one-click way back in. Someone who clicked unsubscribe has finished the
 * conversation; making them confirm it is how a sender gets reported instead
 * of merely left. The footer form is still there if they change their mind.
 */
export default async function UnsubscribedPage({
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
        title={failed ? "That link did not work" : "You're unsubscribed"}
      />
      <Card>
        {failed ? (
          <EmptyState
            icon={<CircleAlert />}
            title="This unsubscribe link is not valid"
            description="It may already have been used. If mail keeps arriving, reply to any of it and we will remove the address by hand."
          />
        ) : (
          <EmptyState
            icon={<MailX />}
            title="Removed"
            description="No more mail from Roboxing. The site stays open — nothing here needs an account."
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
